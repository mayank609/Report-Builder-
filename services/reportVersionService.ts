import type { GeneratedReport } from "@/types";
import type { ReportVersionSnapshot, ReportVersionSummary } from "@/lib/report-versions";

async function json<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || fallback);
  return body as T;
}

/** Archived report versions (full content snapshots, captured server-side). */
export const reportVersionService = {
  async list(reportId: string): Promise<ReportVersionSummary[]> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/versions`, { cache: "no-store" });
    return (await json<{ versions: ReportVersionSummary[] }>(res, "Failed to load versions")).versions;
  },

  async get(reportId: string, version: number): Promise<ReportVersionSnapshot> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/versions/${version}`, {
      cache: "no-store",
    });
    return json<ReportVersionSnapshot>(res, "Failed to load version");
  },

  async restore(reportId: string, version: number): Promise<GeneratedReport> {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/versions/${version}/restore`, {
      method: "POST",
    });
    return json<GeneratedReport>(res, "Failed to restore version");
  },
};
