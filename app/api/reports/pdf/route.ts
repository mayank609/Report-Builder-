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
      import("@sparticuz/chromium"),
      import("puppeteer-core"),
    ]);
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
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

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as PdfRequestBody | null;

  if (!body?.html) {
    return NextResponse.json({ error: "Missing report HTML." }, { status: 400 });
  }

  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(body.html, { waitUntil: "load" });

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

    const filename = (body.filename || "report").replace(/[^a-z0-9-_]+/gi, "-");

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
