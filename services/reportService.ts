import type { GeneratedReport, ReportInput } from "@/types";
import { fetchCollection, fetchDocument, createDocument, updateDocument, deleteDocument } from "@/lib/api-client";
import { numberingService } from "./numberingService";
import { settingsService } from "./settingsService";

export const reportService = {
  async list(): Promise<GeneratedReport[]> {
    return fetchCollection<GeneratedReport>("reports");
  },

  async getById(id: string): Promise<GeneratedReport | null> {
    return fetchDocument<GeneratedReport>("reports", id);
  },

  async create(input: ReportInput): Promise<GeneratedReport> {
    const settings = await settingsService.get();
    const existingCount = (await this.list()).length;
    const reportNumber = await numberingService.next(
      "report",
      settings.reportNumberPrefix,
      existingCount
    );
    const payload: ReportInput & { reportNumber: string } = {
      ...input,
      reportNumber,
      version: input.version ?? 1,
      versionHistory: input.versionHistory && input.versionHistory.length > 0
        ? input.versionHistory
        : [
            {
              version: 1,
              date: new Date().toISOString(),
              action: "Report created",
              actor: "System",
            },
          ],
      sourceRecordIds: input.sourceRecordIds ?? [],
    };
    return createDocument<GeneratedReport>("reports", payload);
  },

  async update(id: string, input: Partial<GeneratedReport>): Promise<GeneratedReport> {
    return updateDocument<GeneratedReport>("reports", id, input);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("reports", id);
  },
};
