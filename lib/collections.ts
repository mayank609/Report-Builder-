import { NextResponse } from "next/server";

/**
 * Collections the generic CRUD API may touch. Anything else (including Mongo
 * system collections and integration-owned collections such as
 * `finance_snapshots`) is rejected, so the URL segment can never be used to
 * read or write arbitrary data.
 */
export const PUBLIC_COLLECTIONS = [
  "projects",
  "records",
  "clients",
  "contractors",
  "engineers",
  "builders",
  "invoices",
  "reports",
  "templates",
  "settings",
] as const;

export type PublicCollection = (typeof PUBLIC_COLLECTIONS)[number];

const PUBLIC_COLLECTION_SET = new Set<string>(PUBLIC_COLLECTIONS);

/** Fields that must never be persisted or returned, per collection. */
const REDACTED_FIELDS: Partial<Record<PublicCollection, readonly string[]>> = {
  // Personal Gemini keys live only in the user's browser (see settingsService).
  settings: ["geminiApiKey"],
};

/** Fields owned by server-side flows; the generic API may not overwrite them. */
const PROTECTED_FIELDS: Partial<Record<PublicCollection, readonly string[]>> = {
  // Written only by the Finance integration (app/api/integration/v1).
  projects: ["finance"],
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_DEPTH = 32;

/** Fields to actively remove from stored documents (e.g. secrets saved by older versions). */
export function redactedFields(collection: PublicCollection): readonly string[] {
  return REDACTED_FIELDS[collection] ?? [];
}

export function isPublicCollection(name: string): name is PublicCollection {
  return PUBLIC_COLLECTION_SET.has(name);
}

export function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Rejects Mongo operator / path injection: any key starting with `$` or
 * containing `.` anywhere in the document. Returns an error message or null.
 */
export function findUnsafeKey(value: unknown, depth = 0): string | null {
  if (depth > MAX_DEPTH) return "Document is nested too deeply";
  if (Array.isArray(value)) {
    for (const item of value) {
      const problem = findUnsafeKey(item, depth + 1);
      if (problem) return problem;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) return `Invalid field name "${key}"`;
      const problem = findUnsafeKey(child, depth + 1);
      if (problem) return problem;
    }
  }
  return null;
}

/** Strips storage-internal, redacted and protected fields from an incoming body. */
export function sanitizeIncoming(
  collection: PublicCollection,
  body: Record<string, unknown>
): Record<string, unknown> {
  const clean = { ...body };
  delete clean._id;
  for (const field of REDACTED_FIELDS[collection] ?? []) delete clean[field];
  for (const field of PROTECTED_FIELDS[collection] ?? []) delete clean[field];
  return clean;
}

/** Maps a stored Mongo document to the API shape (string `id`, no `_id`, no secrets). */
export function toApiDocument(
  collection: PublicCollection,
  doc: Record<string, unknown>
): Record<string, unknown> {
  const id = (doc.id as string | undefined) ?? String(doc._id);
  const clean: Record<string, unknown> = { ...doc, id };
  delete clean._id;
  for (const field of REDACTED_FIELDS[collection] ?? []) delete clean[field];
  return clean;
}

/** Parses a JSON object body, rejecting arrays/primitives and unsafe keys. */
export async function readJsonObject(
  request: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const body = (await request.json().catch(() => undefined)) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, response: badRequest("Request body must be a JSON object") };
  }
  const problem = findUnsafeKey(body);
  if (problem) return { ok: false, response: badRequest(problem) };
  return { ok: true, body: body as Record<string, unknown> };
}
