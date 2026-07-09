import { storage, STORAGE_KEYS } from "@/lib/storage";
import { DEFAULT_SETTINGS, type AppSettings } from "@/types";

export const settingsService = {
  async get(): Promise<AppSettings> {
    return storage.get<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  },

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated = { ...current, ...partial };
    storage.set(STORAGE_KEYS.settings, updated);
    return updated;
  },

  async reset(): Promise<AppSettings> {
    storage.set(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },
};
