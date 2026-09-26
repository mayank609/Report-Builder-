import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";

const COUNTER_TYPES = new Set(["report", "invoice"]);
const MAX_FLOOR = 1_000_000_000;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { docType?: unknown; minimumFloor?: unknown }
    | null;

  const docType = body?.docType;
  if (typeof docType !== "string" || !COUNTER_TYPES.has(docType)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  const rawFloor = Number(body?.minimumFloor ?? 0);
  const minimumFloor = Number.isFinite(rawFloor)
    ? Math.min(Math.max(0, Math.floor(rawFloor)), MAX_FLOOR)
    : 0;

  try {
    const client = await getClient();
    const db = client.db(DB_NAME);

    const counters = db.collection("counters");
    // Two individually-atomic steps, portable across MongoDB-compatible
    // stores: raise the counter to the floor ($max never lowers it), then
    // $inc. Every caller's $inc returns a distinct value, so concurrent
    // requests can never receive the same number.
    await counters.updateOne(
      { id: "docCounters" },
      { $max: { [docType]: minimumFloor } },
      { upsert: true }
    );
    const result = await counters.findOneAndUpdate(
      { id: "docCounters" },
      { $inc: { [docType]: 1 } },
      { returnDocument: "after", upsert: true }
    );

    const nextValue = Number(result?.[docType] ?? minimumFloor + 1);
    return NextResponse.json({ nextValue });
  } catch (error) {
    console.error("Numbering error:", error);
    return NextResponse.json({ error: "Failed to generate number" }, { status: 500 });
  }
}
