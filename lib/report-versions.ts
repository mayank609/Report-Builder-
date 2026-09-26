import type { Db } from "mongodb";
import type { GeneratedReport, ReportSectionContent, ReportVersionEntry } from "@/types";

/**
 * Server-owned report versioning. Every change to a report's *content*
 * archives the complete previous version (sections, summary, layout,
 * signatures, and the financial snapshot time it was built from) into
 * `report_versions` before the change is applied, and bumps `version`.
 * Clients can't skip it: it runs inside the reports PUT handler.
 */
export const REPORT_VERSIONS_COLLECTION = "report_versions";

const CONTENT_FIELDS = ["name", "sections", "aiSummary", "layout"] as const;

export interface ReportVersionSnapshot {
  id: string;
  reportId: string;
  version: number;
  capturedAt: string;
  name: string;
  status: GeneratedReport["status"];
  sections: ReportSectionContent[];
  aiSummary: string;
  layout: GeneratedReport["layout"];
  signatures: GeneratedReport["signatures"];
  /** When the Finance figures inside this version were synced (if any). */
  financeSyncedAt: string | null;
  action: string;
}

export type ReportVersionSummary = Omit<ReportVersionSnapshot, "sections" | "layout" | "signatures" | "aiSummary"> & {
  sectionCount: number;
  signatureCount: number;
};

function stable(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/** Titles of sections whose title/html changed, were added, or were removed. */
export function changedSectionTitles(
  before: ReportSectionContent[] = [],
  after: ReportSectionContent[] = []
): string[] {
  const beforeById = new Map(before.map((s) => [s.sectionId, s]));
  const afterById = new Map(after.map((s) => [s.sectionId, s]));
  const changed: string[] = [];
  for (const s of after) {
    const prev = beforeById.get(s.sectionId);
    if (!prev || prev.html !== s.html || prev.title !== s.title) changed.push(s.title);
  }
  for (const s of before) if (!afterById.has(s.sectionId)) changed.push(`${s.title} (removed)`);
  return changed;
}

export function contentChanged(current: GeneratedReport, patch: Record<string, unknown>): boolean {
  return CONTENT_FIELDS.some(
    (field) => field in patch && stable(patch[field]) !== stable(current[field as keyof GeneratedReport])
  );
}

function lastAction(report: GeneratedReport, version: number): string {
  const entries = (report.versionHistory ?? []).filter((e) => e.version === version);
  return entries.length ? entries[entries.length - 1].action : version === 1 ? "Report created" : "Revision";
}

export async function archiveVersion(
  db: Db,
  report: GeneratedReport,
  financeSyncedAt: string | null
): Promise<void> {
  const version = report.version || 1;
  const snapshot: ReportVersionSnapshot = {
    id: `${report.id}-v${version}`,
    reportId: report.id,
    version,
    capturedAt: new Date().toISOString(),
    name: report.name,
    status: report.status,
    sections: report.sections ?? [],
    aiSummary: report.aiSummary ?? "",
    layout: report.layout,
    signatures: report.signatures ?? [],
    financeSyncedAt,
    action: lastAction(report, version),
  };
  // Keyed by report+version, so retries never create duplicates.
  await db
    .collection<ReportVersionSnapshot>(REPORT_VERSIONS_COLLECTION)
    .replaceOne({ id: snapshot.id }, snapshot, { upsert: true });
}

async function financeSyncedAtFor(db: Db, projectId: string): Promise<string | null> {
  const project = await db
    .collection("projects")
    .findOne({ id: projectId }, { projection: { _id: 0, "finance.syncedAt": 1 } });
  return (project?.finance?.syncedAt as string | undefined) ?? null;
}

/**
 * Prepares a reports PUT: when content changes, archives the current version
 * and returns the patch with the bumped version and a history entry naming
 * the sections that changed. Non-content updates (status, signatures) pass
 * through unchanged.
 */
export async function applyReportVersioning(
  db: Db,
  current: GeneratedReport,
  patch: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!contentChanged(current, patch)) {
    // The version number is server-owned; ignore client attempts to change it.
    const rest = { ...patch };
    delete rest.version;
    return rest;
  }

  await archiveVersion(db, current, await financeSyncedAtFor(db, current.projectId));

  const nextVersion = (current.version || 1) + 1;
  const history: ReportVersionEntry[] = Array.isArray(patch.versionHistory)
    ? (patch.versionHistory as ReportVersionEntry[])
    : [...(current.versionHistory ?? [])];

  const changed = "sections" in patch
    ? changedSectionTitles(current.sections, patch.sections as ReportSectionContent[])
    : [];
  const summary = changed.length ? `Changed: ${changed.slice(0, 8).join(", ")}${changed.length > 8 ? "…" : ""}` : undefined;

  const entryIdx = history.findIndex((e) => e.version === nextVersion);
  if (entryIdx === -1) {
    history.push({
      version: nextVersion,
      date: new Date().toISOString(),
      action: "Content edited",
      actor: "User",
      summary,
    });
  } else if (summary && !history[entryIdx].summary) {
    history[entryIdx] = { ...history[entryIdx], summary };
  }

  return { ...patch, version: nextVersion, versionHistory: history };
}
