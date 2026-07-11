import { storage, STORAGE_KEYS } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import { numberingService } from "./numberingService";
import { settingsService } from "./settingsService";
import type { GeneratedReport, ReportInput } from "@/types";
import seedReportsData from "@/mock-data/reports.json";

const seedReports = seedReportsData as unknown as GeneratedReport[];

function normalizeReport(report: GeneratedReport): GeneratedReport {
  return {
    ...report,
    reportNumber: report.reportNumber || report.id.toUpperCase(),
    sections: report.sections.map((section) => ({
      ...section,
      width: section.width ?? "full",
    })),
  };
}

function readCustomReports(): GeneratedReport[] {
  return storage.get<GeneratedReport[]>(STORAGE_KEYS.reports, []);
}

function writeCustomReports(reports: GeneratedReport[]): void {
  storage.set(STORAGE_KEYS.reports, reports);
}

function mergeReports(): GeneratedReport[] {
  const custom = readCustomReports();
  const customIds = new Set(custom.map((r) => r.id));
  const deletedSeedIds = new Set(
    storage.get<string[]>(STORAGE_KEYS.deletedSeedReportIds, [])
  );
  const seeds = seedReports.filter(
    (r) => !customIds.has(r.id) && !deletedSeedIds.has(r.id)
  );
  return [...custom, ...seeds].map(normalizeReport);
}

export const reportService = {
  async list(): Promise<GeneratedReport[]> {
    return mergeReports().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getById(id: string): Promise<GeneratedReport | null> {
    const all = mergeReports();
    return all.find((r) => r.id === id) ?? null;
  },

  async create(input: ReportInput): Promise<GeneratedReport> {
    const now = new Date().toISOString();
    const settings = await settingsService.get();
    const existingCount = mergeReports().length;
    const reportNumber = await numberingService.next(
      "report",
      settings.reportNumberPrefix,
      existingCount
    );
    const report: GeneratedReport = {
      ...input,
      id: generateId("rpt"),
      reportNumber,
      createdAt: now,
      updatedAt: now,
    };
    const custom = readCustomReports();
    writeCustomReports([report, ...custom]);
    return report;
  },

  async update(id: string, input: Partial<ReportInput>): Promise<GeneratedReport> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Report ${id} not found`);
    }
    const updated: GeneratedReport = {
      ...existing,
      ...input,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    const custom = readCustomReports();
    const withoutId = custom.filter((r) => r.id !== id);
    writeCustomReports([updated, ...withoutId]);
    return updated;
  },

  async remove(id: string): Promise<void> {
    const custom = readCustomReports();
    if (custom.some((r) => r.id === id)) {
      writeCustomReports(custom.filter((r) => r.id !== id));
      return;
    }
    const deletedSeedIds = storage.get<string[]>(STORAGE_KEYS.deletedSeedReportIds, []);
    if (!deletedSeedIds.includes(id)) {
      storage.set(STORAGE_KEYS.deletedSeedReportIds, [...deletedSeedIds, id]);
    }
  },

  async stats(): Promise<{ total: number; completed: number; recent: GeneratedReport[] }> {
    const all = await this.list();
    return {
      total: all.length,
      completed: all.filter((r) => r.status === "completed").length,
      recent: all.slice(0, 5),
    };
  },
};
