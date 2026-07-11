import { storage, STORAGE_KEYS } from "@/lib/storage";
import type { Builder } from "@/types";
import buildersData from "@/mock-data/builders.json";

const builders = buildersData as Builder[];

function readOverrides(): Record<string, Partial<Builder>> {
  return storage.get<Record<string, Partial<Builder>>>(STORAGE_KEYS.builderOverrides, {});
}

function mergeBuilders(): Builder[] {
  const overrides = readOverrides();
  return builders.map((b) => (overrides[b.id] ? { ...b, ...overrides[b.id] } : b));
}

export const builderService = {
  async list(): Promise<Builder[]> {
    return mergeBuilders();
  },

  async getById(id: string): Promise<Builder | null> {
    return mergeBuilders().find((b) => b.id === id) ?? null;
  },

  async update(id: string, partial: Partial<Builder>): Promise<Builder> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Builder ${id} not found`);
    }
    const overrides = readOverrides();
    overrides[id] = { ...overrides[id], ...partial };
    storage.set(STORAGE_KEYS.builderOverrides, overrides);
    return { ...existing, ...partial };
  },
};
