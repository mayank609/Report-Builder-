import { NextRequest, NextResponse } from "next/server";
import type { Browser } from "puppeteer-core";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PdfRequestBody {
  html: string;
  orientation?: "portrait" | "landscape";
  pageNumbers?: boolean;
  filename?: string;
}

/**
 * Full `puppeteer` bundles its own Chromium (~300MB) — great for local dev,
 * but too large for Vercel's serverless function bundle. On Vercel we swap
 * to `puppeteer-core` + `@sparticuz/chromium`, a Chromium build packaged
 * specifically for serverless/Lambda-style environments.
 */
async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const [{ default: chromium }, { default: puppeteerCore }] = await Promise.all([
      import("@sparticuz/chromium-min"),
      import("puppeteer-core"),
    ]);
    
    // Download the pre-compiled chromium binary at runtime since it's >50MB
    const packUrl = "https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar";
    
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(packUrl),
      headless: true,
    });
  }

  const { default: puppeteer } = await import("puppeteer");
  const localBrowser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  return localBrowser as unknown as Browser;
}

/** Reports embed signature/photo data URLs, so allow a generous but finite payload. */
const MAX_HTML_BYTES = 20 * 1024 * 1024;
const RENDER_TIMEOUT_MS = 30_000;

/**
 * The HTML comes from the browser, so treat it as untrusted: only data/blob
 * URLs and public http(s) hosts may load. This blocks SSRF against cloud
 * metadata endpoints, localhost services and private networks, plus file://.
 */
function isAllowedResourceUrl(rawUrl: string): boolean {
  if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:") || rawUrl === "about:blank") {
    return true;
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return false;
  }
  // IPv4 literals in loopback, private, link-local, CGNAT or unspecified ranges
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  // Numeric/hex host shorthands (e.g. 2130706433, 0x7f000001) resolve to IPs
  if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) return false;
  // IPv6 literals: block loopback, unspecified, unique-local, link-local, mapped v4
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return false;
    if (/^(fc|fd|fe8|fe9|fea|feb)/.test(host)) return false;
    if (host.startsWith("::ffff:")) return false;
  }
  return true;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_HTML_BYTES) {
    return NextResponse.json({ error: "Report is too large to export." }, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as PdfRequestBody | null;

  if (!body?.html || typeof body.html !== "string") {
    return NextResponse.json({ error: "Missing report HTML." }, { status: 400 });
  }
  if (body.html.length > MAX_HTML_BYTES) {
    return NextResponse.json({ error: "Report is too large to export." }, { status: 413 });
  }

  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    // Report and invoice HTML is static markup + inline SVG; no scripts needed.
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (isAllowedResourceUrl(req.url())) void req.continue();
      else void req.abort("blockedbyclient");
    });
    await page.setContent(body.html, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });

    const pdfBuffer = await page.pdf({
      format: "Letter",
      landscape: body.orientation === "landscape",
      printBackground: true,
      displayHeaderFooter: Boolean(body.pageNumbers),
      headerTemplate: "<span></span>",
      footerTemplate: body.pageNumbers
        ? `<div style="width:100%; font-size:9px; text-align:center; color:#9ca3af; padding-top:4px;">
             Page <span class="pageNumber"></span> of <span class="totalPages"></span>
           </div>`
        : "<span></span>",
      margin: body.pageNumbers
        ? { top: "0.6in", bottom: "0.7in", left: "0.6in", right: "0.6in" }
        : { top: "0.6in", bottom: "0.6in", left: "0.6in", right: "0.6in" },
    });

    const filename = String(body.filename || "report")
      .slice(0, 120).replace(/[^a-z0-9-_]+/gi, "-");

    return new NextResponse(new Blob([new Uint8Array(pdfBuffer)]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error", error);
    return NextResponse.json({ error: "Failed to generate PDF." }, { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}
