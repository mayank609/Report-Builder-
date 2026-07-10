import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // puppeteer-core + @sparticuz/chromium ship native/non-JS assets that must
  // be copied as-is into the serverless function rather than bundled by webpack.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
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
