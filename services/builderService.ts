import type { Builder } from "@/types";
import buildersData from "@/mock-data/builders.json";

const builders = buildersData as Builder[];

export const builderService = {
  async list(): Promise<Builder[]> {
    return builders;
  },

  async getById(id: string): Promise<Builder | null> {
    return builders.find((b) => b.id === id) ?? null;
  },
};
