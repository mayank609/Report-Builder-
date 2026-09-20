import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const { docType, minimumFloor } = await request.json();
    const client = await getClient();
    const db = client.db(DB_NAME);
    
    // Attempt to atomically increment the counter
    const result = await db.collection("counters").findOneAndUpdate(
      { id: "docCounters" },
      { $inc: { [docType]: 1 } },
      { returnDocument: "after", upsert: true }
    );
    
    // If the incremented value is less than the minimumFloor (e.g., first run after migrating from local storage)
    // we need to bump it up to the minimumFloor + 1
    let nextValue = result?.[docType] || 1;
    if (nextValue <= minimumFloor) {
      nextValue = minimumFloor + 1;
      await db.collection("counters").updateOne(
        { id: "docCounters" },
        { $set: { [docType]: nextValue } }
      );
    }
    
    return NextResponse.json({ nextValue });
  } catch (error) {
    console.error("Numbering error:", error);
    return NextResponse.json({ error: "Failed to generate number" }, { status: 500 });
  }
}
