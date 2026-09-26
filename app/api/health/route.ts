import { NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

/** Liveness + dependency check for load balancers and uptime monitors. */
export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  try {
    const client = await getClient();
    await client.db(DB_NAME).command({ ping: 1 });
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }
  const healthy = Object.values(checks).every((status) => status === "ok");
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", service: "report-builder", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
