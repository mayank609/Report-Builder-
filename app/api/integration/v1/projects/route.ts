import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { authorizeIntegrationRequest } from "@/lib/integration/auth";
import type { ReportProjectSummary } from "@/integration/contract";

export const dynamic = "force-dynamic";

/** Lightweight project listing so Finance can link its projects to Report Builder ones. */
export async function GET(request: NextRequest) {
  const denied = authorizeIntegrationRequest(request);
  if (denied) return denied;

  try {
    const client = await getClient();
    const docs = await client
      .db(DB_NAME)
      .collection("projects")
      .find(
        {},
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            projectCode: 1,
            status: 1,
            "finance.financeProjectId": 1,
            "finance.syncedAt": 1,
          },
        }
      )
      .sort({ name: 1 })
      .limit(5000)
      .toArray();

    const projects: ReportProjectSummary[] = docs.map((doc) => ({
      id: String(doc.id),
      name: String(doc.name ?? ""),
      projectCode: String(doc.projectCode ?? ""),
      status: String(doc.status ?? ""),
      financeProjectId: doc.finance?.financeProjectId ?? null,
      financeSyncedAt: doc.finance?.syncedAt ?? null,
    }));

    return NextResponse.json({ projects });
  } catch (error) {
    console.error("integration: failed to list projects", error);
    return NextResponse.json({ error: "Failed to list projects" }, { status: 500 });
  }
}
