import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Server-to-server auth for /api/integration/v1. The Finance module calls
 * these routes from its own server (never from a browser), presenting
 * `Authorization: Bearer <INTEGRATION_API_KEY>`.
 *
 * With no key configured the API is open in development (so both modules work
 * out of the box locally) and disabled in production.
 */
export function authorizeIntegrationRequest(request: Request): NextResponse | null {
  const expected = process.env.INTEGRATION_API_KEY?.trim();

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Integration API is not configured (set INTEGRATION_API_KEY)." },
        { status: 503 }
      );
    }
    return null;
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
