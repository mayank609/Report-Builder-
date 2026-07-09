import { storage, STORAGE_KEYS } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import type { ReportTemplate, TemplateInput } from "@/types";
import seedTemplatesData from "@/mock-data/templates.json";

const seedTemplates = seedTemplatesData as ReportTemplate[];

function readCustomTemplates(): ReportTemplate[] {
  return storage.get<ReportTemplate[]>(STORAGE_KEYS.templates, []);
}

function writeCustomTemplates(templates: ReportTemplate[]): void {
  storage.set(STORAGE_KEYS.templates, templates);
}

function readDeletedSeedIds(): string[] {
  return storage.get<string[]>(STORAGE_KEYS.deletedSeedTemplateIds, []);
}

function mergeTemplates(): ReportTemplate[] {
  const custom = readCustomTemplates();
  const customIds = new Set(custom.map((t) => t.id));
  const deletedSeedIds = new Set(readDeletedSeedIds());
  const seeds = seedTemplates.filter(
    (t) => !customIds.has(t.id) && !deletedSeedIds.has(t.id)
  );
  return [...custom, ...seeds];
}

export const templateService = {
  async list(): Promise<ReportTemplate[]> {
    return mergeTemplates().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  async getById(id: string): Promise<ReportTemplate | null> {
    const all = mergeTemplates();
    return all.find((t) => t.id === id) ?? null;
  },

  async create(input: TemplateInput): Promise<ReportTemplate> {
    const now = new Date().toISOString();
    const template: ReportTemplate = {
      ...input,
      id: generateId("tpl"),
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };
    const custom = readCustomTemplates();
    writeCustomTemplates([template, ...custom]);
    return template;
  },

  async update(
    id: string,
    input: Partial<TemplateInput> & { usageCount?: number }
  ): Promise<ReportTemplate> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }
    const updated: ReportTemplate = {
      ...existing,
      ...input,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    const custom = readCustomTemplates();
    const withoutId = custom.filter((t) => t.id !== id);
    writeCustomTemplates([updated, ...withoutId]);
    return updated;
  },

  async remove(id: string): Promise<void> {
    const custom = readCustomTemplates();
    if (custom.some((t) => t.id === id)) {
      writeCustomTemplates(custom.filter((t) => t.id !== id));
      return;
    }
    const deletedSeedIds = readDeletedSeedIds();
    if (!deletedSeedIds.includes(id)) {
      storage.set(STORAGE_KEYS.deletedSeedTemplateIds, [...deletedSeedIds, id]);
    }
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
