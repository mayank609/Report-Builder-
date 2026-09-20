import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;
    const client = await getClient();
    const db = client.db(DB_NAME);
    
    const doc = await db.collection(collection).findOne({ id });
    
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    const cleanDoc = { ...doc } as Record<string, unknown>;
    delete cleanDoc._id;
    return NextResponse.json(cleanDoc);
  } catch (error) {
    console.error(`Failed to fetch ${await params.then(p => p.id)} from ${await params.then(p => p.collection)}:`, error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;
    const body = await request.json();
    const client = await getClient();
    const db = client.db(DB_NAME);
    
    const doc = {
      ...body,
      updatedAt: new Date().toISOString(),
    };
    // Don't update the _id field
    delete doc._id;
    
    const result = await db.collection(collection).findOneAndUpdate(
      { id },
      { $set: doc },
      { returnDocument: "after", upsert: true }
    );
    
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    const cleanResult = { ...result } as Record<string, unknown>;
    delete cleanResult._id;
    return NextResponse.json(cleanResult);
  } catch (error) {
    console.error(`Failed to update ${await params.then(p => p.id)} in ${await params.then(p => p.collection)}:`, error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; id: string }> }
) {
  try {
    const { collection, id } = await params;
    const client = await getClient();
    const db = client.db(DB_NAME);
    
    const result = await db.collection(collection).deleteOne({ id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Failed to delete ${await params.then(p => p.id)} from ${await params.then(p => p.collection)}:`, error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
