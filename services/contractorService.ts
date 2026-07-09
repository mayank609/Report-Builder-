import type { Contractor } from "@/types";
import contractorsData from "@/mock-data/contractors.json";

const contractors = contractorsData as Contractor[];

export const contractorService = {
  async list(): Promise<Contractor[]> {
    return contractors;
  },

  async getById(id: string): Promise<Contractor | null> {
    return contractors.find((c) => c.id === id) ?? null;
  },

  async getByIds(ids: string[]): Promise<Contractor[]> {
    const set = new Set(ids);
    return contractors.filter((c) => set.has(c.id));
  },
};
