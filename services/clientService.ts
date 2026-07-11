import { storage, STORAGE_KEYS } from "@/lib/storage";
import type { Client } from "@/types";
import clientsData from "@/mock-data/clients.json";

const clients = clientsData as Client[];

function readOverrides(): Record<string, Partial<Client>> {
  return storage.get<Record<string, Partial<Client>>>(STORAGE_KEYS.clientOverrides, {});
}

function mergeClients(): Client[] {
  const overrides = readOverrides();
  return clients.map((c) => (overrides[c.id] ? { ...c, ...overrides[c.id] } : c));
}

export const clientService = {
  async list(): Promise<Client[]> {
    return mergeClients();
  },

  async getById(id: string): Promise<Client | null> {
    return mergeClients().find((c) => c.id === id) ?? null;
  },

  async update(id: string, partial: Partial<Client>): Promise<Client> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Client ${id} not found`);
    }
    const overrides = readOverrides();
    overrides[id] = { ...overrides[id], ...partial };
    storage.set(STORAGE_KEYS.clientOverrides, overrides);
    return { ...existing, ...partial };
  },
};
