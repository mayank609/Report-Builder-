import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core + @sparticuz/chromium ship native/non-JS assets that must
  // be copied as-is into the serverless function rather than bundled by webpack.
  // pdf-parse (pdf.js-based) and mammoth break when webpack tries to bundle
  // their internal dynamic requires/worker scripts, so they must run as
  // plain Node `require`s too. @napi-rs/canvas is a native (.node) binding
  // pdf-parse's screenshot rendering depends on, and jszip's default export
  // resolution also gets mangled the same way when bundled.
  serverExternalPackages: [
    "puppeteer-core",
    "@sparticuz/chromium-min",
    "pdf-parse",
    "mammoth",
    "@napi-rs/canvas",
    "jszip",
  ],
  // Full `puppeteer` (with its bundled ~300MB Chromium download) is only
  // ever imported on the local-dev code path in app/api/reports/pdf/route.ts.
  // Vercel's build-time file tracer can't see that the import is
  // conditional on `!process.env.VERCEL`, so without this exclusion it
  // would still copy the entire package into the deployed function and
  // blow past Vercel's function size limit.
  outputFileTracingExcludes: {
    "/api/reports/pdf": ["node_modules/puppeteer/**"],
  },
};

export default nextConfig;
