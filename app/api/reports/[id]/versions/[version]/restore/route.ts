import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { isValidId } from "@/lib/collections";
import {
  applyReportVersioning,
  contentChanged,
  REPORT_VERSIONS_COLLECTION,
  type ReportVersionSnapshot,
} from "@/lib/report-versions";
import type { GeneratedReport } from "@/types";

export const dynamic = "force-dynamic";

/**
 * Restores an old version's content as a NEW version (history is never
 * rewritten): the current content is archived first, then vN's content is
 * applied and the report returns to In Review for re-approval.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; version: string }> }
) {
  const { id, version } = await params;
  const versionNumber = Number(version);
  if (!isValidId(id) || !Number.isInteger(versionNumber) || versionNumber < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const client = await getClient();
    const db = client.db(DB_NAME);
    const reports = db.collection<GeneratedReport>("reports");

    const [current, snapshot] = await Promise.all([
      reports.findOne({ id }),
      db
        .collection<ReportVersionSnapshot>(REPORT_VERSIONS_COLLECTION)
        .findOne({ reportId: id, version: versionNumber }),
    ]);
    if (!current || !snapshot) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const restoredContent = {
      name: snapshot.name,
      sections: snapshot.sections,
      aiSummary: snapshot.aiSummary,
      layout: snapshot.layout,
    };
    if (!contentChanged(current, restoredContent)) {
      return NextResponse.json(
        { error: `The current version already matches v${versionNumber}.` },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const nextVersion = (current.version || 1) + 1;
    const patch = await applyReportVersioning(db, current, {
      ...restoredContent,
      // Signatures applied to other content no longer attest to it.
      signatures: [],
      status: "in_review",
      versionHistory: [
        ...(current.versionHistory ?? []),
        {
          version: nextVersion,
          date: now,
          action: `Restored from v${versionNumber}`,
          actor: "User",
        },
      ],
    });

    const result = await reports.findOneAndUpdate(
      { id },
      { $set: { ...patch, updatedAt: now } },
      { returnDocument: "after" }
    );
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { _id, ...restored } = result;
    void _id;
    return NextResponse.json(restored);
  } catch (error) {
    console.error("Failed to restore report version", error);
    return NextResponse.json({ error: "Failed to restore version" }, { status: 500 });
  }
}
