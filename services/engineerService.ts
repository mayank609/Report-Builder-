import type { Engineer } from "@/types";
import { fetchCollection, fetchDocument, createDocument, updateDocument, deleteDocument } from "@/lib/api-client";

export const engineerService = {
  async list(): Promise<Engineer[]> {
    return fetchCollection<Engineer>("engineers");
  },

  async getById(id: string): Promise<Engineer | null> {
    return fetchDocument<Engineer>("engineers", id);
  },

  async create(input: Omit<Engineer, "id">): Promise<Engineer> {
    return createDocument<Engineer>("engineers", input as Partial<Engineer>);
  },

  async update(id: string, partial: Partial<Engineer>): Promise<Engineer> {
    return updateDocument<Engineer>("engineers", id, partial);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("engineers", id);
  },
};
