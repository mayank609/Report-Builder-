import { DEFAULT_SETTINGS, type AppSettings } from "@/types";
import { fetchDocument, updateDocument } from "@/lib/api-client";

export const settingsService = {
  async get(): Promise<AppSettings> {
    try {
      const stored = await fetchDocument<AppSettings>("settings", "app-settings");
      if (stored) return { ...DEFAULT_SETTINGS, ...stored };
    } catch {
      // Settings doc doesn't exist yet — use defaults
    }
    return { ...DEFAULT_SETTINGS };
  },

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated = { ...current, ...partial };
    return updateDocument<AppSettings>("settings", "app-settings", updated);
  },

  async reset(): Promise<AppSettings> {
    return this.update(DEFAULT_SETTINGS);
  },
};
