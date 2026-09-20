import type { ProjectRecord, ProjectRecordType, RecordStatus } from "@/types";
import { RECORD_TYPE_CONFIGS } from "@/types/record";
import {
  fetchCollection,
  fetchDocument,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/lib/api-client";

export const recordService = {
  async list(filter?: {
    projectId?: string;
    type?: ProjectRecordType;
    status?: RecordStatus;
  }): Promise<ProjectRecord[]> {
    const all = await fetchCollection<ProjectRecord>("records");
    return all.filter((r) => {
      if (filter?.projectId && r.projectId !== filter.projectId) return false;
      if (filter?.type && r.type !== filter.type) return false;
      if (filter?.status && r.status !== filter.status) return false;
      return true;
    });
  },

  async getById(id: string): Promise<ProjectRecord | null> {
    return fetchDocument<ProjectRecord>("records", id);
  },

  async create(
    input: Partial<ProjectRecord> & { type: ProjectRecordType; projectId: string; title: string }
  ): Promise<ProjectRecord> {
    // Generate next reference number for this record type
    const prefix = RECORD_TYPE_CONFIGS[input.type]?.prefix || "REC";
    const existing = await this.list({ type: input.type });
    const nextNum = existing.length + 1;
    const referenceNumber = `${prefix}-${String(nextNum).padStart(4, "0")}`;

    const record: Partial<ProjectRecord> = {
      referenceNumber,
      status: input.status || "open",
      priority: input.priority || "medium",
      date: input.date || new Date().toISOString().slice(0, 10),
      notes: input.notes || "",
      attachments: input.attachments || [],
      data: input.data || {},
      responsiblePerson: input.responsiblePerson || "",
      ...input,
    };

    return createDocument<ProjectRecord>("records", record);
  },

  async update(id: string, partial: Partial<ProjectRecord>): Promise<ProjectRecord> {
    return updateDocument<ProjectRecord>("records", id, partial);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("records", id);
  },
};
