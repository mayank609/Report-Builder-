import type { Engineer } from "@/types";
import engineersData from "@/mock-data/engineers.json";

const engineers = engineersData as Engineer[];

export const engineerService = {
  async list(): Promise<Engineer[]> {
    return engineers;
  },

  async getById(id: string): Promise<Engineer | null> {
    return engineers.find((e) => e.id === id) ?? null;
  },

  async getByIds(ids: string[]): Promise<Engineer[]> {
    const set = new Set(ids);
    return engineers.filter((e) => set.has(e.id));
  },
};
