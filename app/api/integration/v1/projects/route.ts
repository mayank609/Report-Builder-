import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { authorizeIntegrationRequest } from "@/lib/integration/auth";
import { createOrUpdateProjectFromFinance } from "@/lib/integration/create-project";
import {
  createProjectFromFinanceRequestSchema,
  type ReportProjectSummary,
} from "@/integration/contract";

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

const MAX_BODY_BYTES = 1024 * 1024;

/**
 * "Enter once": Finance creates the field project (plus client and builder)
 * from its own project record and publishes the first financial snapshot.
 * Idempotent on the Finance project id — repeated calls refresh financials.
 */
export async function POST(request: NextRequest) {
  const denied = authorizeIntegrationRequest(request);
  if (denied) return denied;

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const parsed = createProjectFromFinanceRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Payload does not match the integration contract",
        issues: parsed.error.issues.slice(0, 20).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }

  try {
    const client = await getClient();
    const { project, created } = await createOrUpdateProjectFromFinance(
      client.db(DB_NAME),
      parsed.data
    );
    const summary: ReportProjectSummary = {
      id: project.id,
      name: project.name,
      projectCode: project.projectCode,
      status: project.status,
      financeProjectId: project.finance?.financeProjectId ?? null,
      financeSyncedAt: project.finance?.syncedAt ?? null,
    };
    return NextResponse.json({ project: summary, created }, { status: created ? 201 : 200 });
  } catch (error) {
    console.error("integration: failed to create project from finance", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
