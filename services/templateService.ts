import type { ReportTemplate, TemplateInput } from "@/types";
import { fetchCollection, fetchDocument, createDocument, updateDocument, deleteDocument } from "@/lib/api-client";

export const templateService = {
  async list(): Promise<ReportTemplate[]> {
    return fetchCollection<ReportTemplate>("templates");
  },

  async getById(id: string): Promise<ReportTemplate | null> {
    return fetchDocument<ReportTemplate>("templates", id);
  },

  async create(input: TemplateInput): Promise<ReportTemplate> {
    return createDocument<ReportTemplate>("templates", { ...input, usageCount: 0 });
  },

  async update(
    id: string,
    input: Partial<TemplateInput> & { usageCount?: number }
  ): Promise<ReportTemplate> {
    return updateDocument<ReportTemplate>("templates", id, input);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("templates", id);
  },

  async duplicate(id: string): Promise<ReportTemplate> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }
    return this.create({
      name: `${existing.name} (Copy)`,
      reportType: existing.reportType,
      description: existing.description,
      status: "draft",
      documentKind: existing.documentKind,
      origin: existing.origin,
      invoiceDefaults: existing.invoiceDefaults,
      layout: existing.layout,
      sections: existing.sections,
      createdBy: existing.createdBy,
      aiGenerated: existing.aiGenerated,
    });
  },

  async incrementUsage(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;
    await this.update(id, { usageCount: existing.usageCount + 1 });
  },

  async stats(): Promise<{ total: number; published: number; draft: number }> {
    const all = await this.list();
    return {
      total: all.length,
      published: all.filter((t) => t.status === "published").length,
      draft: all.filter((t) => t.status === "draft").length,
    };
  },
};
