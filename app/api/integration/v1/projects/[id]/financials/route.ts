import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { isValidId } from "@/lib/collections";
import { authorizeIntegrationRequest } from "@/lib/integration/auth";
import { projectPatchFromSnapshot } from "@/lib/integration/apply-snapshot";
import { pushFinancialsRequestSchema } from "@/integration/contract";
import type { Project } from "@/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const MAX_BODY_BYTES = 1024 * 1024;

export async function GET(request: NextRequest, { params }: Params) {
  const denied = authorizeIntegrationRequest(request);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const client = await getClient();
    const doc = await client
      .db(DB_NAME)
      .collection("projects")
      .findOne({ id }, { projection: { _id: 0, finance: 1 } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ finance: doc.finance ?? null });
  } catch (error) {
    console.error("integration: failed to read financials", error);
    return NextResponse.json({ error: "Failed to read financials" }, { status: 500 });
  }
}

/**
 * Finance publishes the latest snapshot for one Report Builder project. The
 * snapshot is validated against the shared contract, mirrored onto the
 * project's budget/change-order fields, and appended to an audit history.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = authorizeIntegrationRequest(request);
  if (denied) return denied;

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Snapshot too large" }, { status: 413 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = pushFinancialsRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Snapshot does not match the integration contract",
        issues: parsed.error.issues.slice(0, 20).map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    );
  }
  const { snapshot } = parsed.data;

  try {
    const client = await getClient();
    const db = client.db(DB_NAME);
    const projects = db.collection<Project>("projects");

    const project = await projects.findOne({ id }, { projection: { changeOrders: 1 } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const syncedAt = new Date().toISOString();
    const patch = projectPatchFromSnapshot(project, snapshot, syncedAt);

    await projects.updateOne({ id }, { $set: { ...patch, updatedAt: syncedAt } });
    await db.collection("finance_snapshots").insertOne({
      reportProjectId: id,
      financeProjectId: snapshot.source.projectId,
      receivedAt: syncedAt,
      snapshot,
    });

    return NextResponse.json({ ok: true, reportProjectId: id, syncedAt });
  } catch (error) {
    console.error("integration: failed to store financials", error);
    return NextResponse.json({ error: "Failed to store financials" }, { status: 500 });
  }
}
