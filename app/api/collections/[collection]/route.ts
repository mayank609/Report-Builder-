import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { generateId } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    const client = await getClient();
    const db = client.db(DB_NAME);
    
    // Sort by createdAt descending if exists, else updatedAt, else natural order
    const docs = await db.collection(collection).find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
    
    // Remove the MongoDB specific _id from response, use standard 'id'
    const cleanDocs = docs.map((doc) => {
      const id = doc.id || doc._id.toString();
      const cleanDoc = { ...doc, id } as Record<string, unknown>;
      delete cleanDoc._id;
      return cleanDoc;
    });
    
    return NextResponse.json(cleanDocs);
  } catch (error) {
    console.error(`Failed to fetch ${await params.then(p => p.collection)}:`, error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    const body = await request.json();
    const client = await getClient();
    const db = client.db(DB_NAME);
    
    const now = new Date().toISOString();
    
    // Ensure standard ID and timestamps
    const doc = {
      ...body,
      id: body.id || generateId(collection.substring(0, 3)),
      createdAt: body.createdAt || now,
      updatedAt: body.updatedAt || now,
    };
    
    await db.collection(collection).insertOne(doc);
    
    const cleanDoc = { ...doc } as Record<string, unknown>;
    delete cleanDoc._id;
    return NextResponse.json(cleanDoc, { status: 201 });
  } catch (error) {
    console.error(`Failed to insert into ${await params.then(p => p.collection)}:`, error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}
