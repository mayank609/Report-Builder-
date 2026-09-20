import type { Client } from "@/types";
import { fetchCollection, fetchDocument, createDocument, updateDocument, deleteDocument } from "@/lib/api-client";

export const clientService = {
  async list(): Promise<Client[]> {
    return fetchCollection<Client>("clients");
  },

  async getById(id: string): Promise<Client | null> {
    return fetchDocument<Client>("clients", id);
  },

  async create(input: Omit<Client, "id">): Promise<Client> {
    return createDocument<Client>("clients", input as Partial<Client>);
  },

  async update(id: string, partial: Partial<Client>): Promise<Client> {
    return updateDocument<Client>("clients", id, partial);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("clients", id);
  },
};
