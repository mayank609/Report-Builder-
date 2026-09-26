import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { isValidId } from "@/lib/collections";
import {
  REPORT_VERSIONS_COLLECTION,
  type ReportVersionSnapshot,
  type ReportVersionSummary,
} from "@/lib/report-versions";

export const dynamic = "force-dynamic";

/** Lists archived versions of a report (newest first), without their content. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const client = await getClient();
    const docs = await client
      .db(DB_NAME)
      .collection<ReportVersionSnapshot>(REPORT_VERSIONS_COLLECTION)
      .find({ reportId: id }, { projection: { _id: 0 } })
      .sort({ version: -1 })
      .limit(500)
      .toArray();

    const versions: ReportVersionSummary[] = docs.map((doc) => ({
      id: doc.id,
      reportId: doc.reportId,
      version: doc.version,
      capturedAt: doc.capturedAt,
      name: doc.name,
      status: doc.status,
      financeSyncedAt: doc.financeSyncedAt ?? null,
      action: doc.action,
      sectionCount: doc.sections?.length ?? 0,
      signatureCount: doc.signatures?.length ?? 0,
    }));
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("Failed to list report versions", error);
    return NextResponse.json({ error: "Failed to list versions" }, { status: 500 });
  }
}
