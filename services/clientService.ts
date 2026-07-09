import type { Client } from "@/types";
import clientsData from "@/mock-data/clients.json";

const clients = clientsData as Client[];

export const clientService = {
  async list(): Promise<Client[]> {
    return clients;
  },

  async getById(id: string): Promise<Client | null> {
    return clients.find((c) => c.id === id) ?? null;
  },
};
