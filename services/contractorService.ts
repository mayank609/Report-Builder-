import type { Contractor } from "@/types";
import { fetchCollection, fetchDocument, createDocument, updateDocument, deleteDocument } from "@/lib/api-client";

export const contractorService = {
  async list(): Promise<Contractor[]> {
    return fetchCollection<Contractor>("contractors");
  },

  async getById(id: string): Promise<Contractor | null> {
    return fetchDocument<Contractor>("contractors", id);
  },

  async create(input: Omit<Contractor, "id">): Promise<Contractor> {
    return createDocument<Contractor>("contractors", input as Partial<Contractor>);
  },

  async update(id: string, partial: Partial<Contractor>): Promise<Contractor> {
    return updateDocument<Contractor>("contractors", id, partial);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("contractors", id);
  },
};
