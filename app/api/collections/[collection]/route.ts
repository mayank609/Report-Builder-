import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import { generateId } from "@/lib/utils";
import {
  badRequest,
  isPublicCollection,
  isValidId,
  notFound,
  readJsonObject,
  sanitizeIncoming,
  toApiDocument,
} from "@/lib/collections";

/** Hard ceiling so a single list call can't pull an unbounded collection. */
const MAX_LIST_LIMIT = 5000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;
  if (!isPublicCollection(collection)) return notFound();

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? MAX_LIST_LIMIT);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(1, Math.floor(limitParam)), MAX_LIST_LIMIT)
    : MAX_LIST_LIMIT;

  try {
    const client = await getClient();
    const db = client.db(DB_NAME);

    // Sort by updatedAt/createdAt descending when present, else natural order
    const docs = await db
      .collection(collection)
      .find({})
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(docs.map((doc) => toApiDocument(collection, doc)));
  } catch (error) {
    console.error(`Failed to fetch ${collection}:`, error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;
  if (!isPublicCollection(collection)) return notFound();

  const parsed = await readJsonObject(request);
  if (!parsed.ok) return parsed.response;
  const body = sanitizeIncoming(collection, parsed.body);

  if (body.id !== undefined && (typeof body.id !== "string" || !isValidId(body.id))) {
    return badRequest("Invalid id");
  }

  try {
    const client = await getClient();
    const db = client.db(DB_NAME);
    const now = new Date().toISOString();

    // Ensure standard ID and timestamps
    const doc = {
      ...body,
      id: (body.id as string | undefined) || generateId(collection.substring(0, 3)),
      createdAt: body.createdAt || now,
      updatedAt: body.updatedAt || now,
    };

    if (await db.collection(collection).findOne({ id: doc.id }, { projection: { _id: 1 } })) {
      return NextResponse.json({ error: "A record with this id already exists" }, { status: 409 });
    }

    await db.collection(collection).insertOne(doc);
    return NextResponse.json(toApiDocument(collection, doc), { status: 201 });
  } catch (error) {
    console.error(`Failed to insert into ${collection}:`, error);
    return NextResponse.json({ error: "Failed to create record" }, { status: 500 });
  }
}
