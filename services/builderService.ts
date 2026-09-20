import type { Builder } from "@/types";
import { fetchCollection, fetchDocument, updateDocument } from "@/lib/api-client";

export const builderService = {
  async list(): Promise<Builder[]> {
    return fetchCollection<Builder>("builders");
  },

  async getById(id: string): Promise<Builder | null> {
    return fetchDocument<Builder>("builders", id);
  },

  async update(id: string, partial: Partial<Builder>): Promise<Builder> {
    return updateDocument<Builder>("builders", id, partial);
  },
};
