import { NextRequest, NextResponse } from "next/server";
import getClient, { DB_NAME } from "@/lib/mongodb";
import {
  isPublicCollection,
  isValidId,
  notFound,
  readJsonObject,
  redactedFields,
  sanitizeIncoming,
  toApiDocument,
  type PublicCollection,
} from "@/lib/collections";

type Params = { params: Promise<{ collection: string; id: string }> };

/** Singleton documents that are created on first save rather than via POST. */
const UPSERT_COLLECTIONS = new Set<PublicCollection>(["settings"]);

async function resolveParams(params: Params["params"]) {
  const { collection, id } = await params;
  if (!isPublicCollection(collection) || !isValidId(id)) return null;
  return { collection, id };
}

export async function GET(_request: NextRequest, { params }: Params) {
  const resolved = await resolveParams(params);
  if (!resolved) return notFound();
  const { collection, id } = resolved;

  try {
    const client = await getClient();
    const doc = await client.db(DB_NAME).collection(collection).findOne({ id });
    if (!doc) return notFound();
    return NextResponse.json(toApiDocument(collection, doc));
  } catch (error) {
    console.error(`Failed to fetch ${id} from ${collection}:`, error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const resolved = await resolveParams(params);
  if (!resolved) return notFound();
  const { collection, id } = resolved;

  const parsed = await readJsonObject(request);
  if (!parsed.ok) return parsed.response;

  const doc = sanitizeIncoming(collection, parsed.body);
  // The document id is immutable; it always comes from the URL.
  delete doc.id;
  doc.updatedAt = new Date().toISOString();

  // Purge secrets that older versions persisted (e.g. settings.geminiApiKey).
  const purge = Object.fromEntries(redactedFields(collection).map((field) => [field, ""]));

  try {
    const client = await getClient();
    const result = await client
      .db(DB_NAME)
      .collection(collection)
      .findOneAndUpdate(
        { id },
        {
          $set: doc,
          $setOnInsert: { id },
          ...(Object.keys(purge).length ? { $unset: purge } : {}),
        },
        { returnDocument: "after", upsert: UPSERT_COLLECTIONS.has(collection) }
      );

    if (!result) return notFound();
    return NextResponse.json(toApiDocument(collection, result));
  } catch (error) {
    console.error(`Failed to update ${id} in ${collection}:`, error);
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const resolved = await resolveParams(params);
  if (!resolved) return notFound();
  const { collection, id } = resolved;

  try {
    const client = await getClient();
    const result = await client.db(DB_NAME).collection(collection).deleteOne({ id });
    if (result.deletedCount === 0) return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`Failed to delete ${id} from ${collection}:`, error);
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
