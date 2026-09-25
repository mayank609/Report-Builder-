import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { isValidId } from "@/lib/collections";
import { REPORT_VERSIONS_COLLECTION, type ReportVersionSnapshot } from "@/lib/report-versions";

export const dynamic = "force-dynamic";

/** Full content of one archived version, for read-only viewing. */
export async function GET(
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
    const doc = await client
      .db(DB_NAME)
      .collection<ReportVersionSnapshot>(REPORT_VERSIONS_COLLECTION)
      .findOne({ reportId: id, version: versionNumber }, { projection: { _id: 0 } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (error) {
    console.error("Failed to read report version", error);
    return NextResponse.json({ error: "Failed to read version" }, { status: 500 });
  }
}
