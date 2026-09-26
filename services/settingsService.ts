import { DEFAULT_SETTINGS, type AppSettings } from "@/types";
import { fetchDocument, updateDocument } from "@/lib/api-client";

/**
 * The personal Gemini key is a secret, so it is kept only in this browser's
 * LocalStorage and never sent to the shared settings document (the API also
 * strips it server-side).
 */
const GEMINI_KEY_STORAGE_KEY = "buildreport:gemini-api-key";

function readLocalGeminiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(GEMINI_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeLocalGeminiKey(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.localStorage.setItem(GEMINI_KEY_STORAGE_KEY, value);
    else window.localStorage.removeItem(GEMINI_KEY_STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode) — the key simply won't persist.
  }
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    const geminiApiKey = readLocalGeminiKey();
    try {
      const stored = await fetchDocument<AppSettings>("settings", "app-settings");
      if (stored) return { ...DEFAULT_SETTINGS, ...stored, geminiApiKey };
    } catch {
      // Settings doc doesn't exist yet — use defaults
    }
    return { ...DEFAULT_SETTINGS, geminiApiKey };
  },

  async update(partial: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const { geminiApiKey, ...shared } = { ...current, ...partial };
    writeLocalGeminiKey(geminiApiKey ?? "");
    const saved = await updateDocument<AppSettings>("settings", "app-settings", shared);
    return { ...DEFAULT_SETTINGS, ...saved, geminiApiKey: geminiApiKey ?? "" };
  },

  async reset(): Promise<AppSettings> {
    return this.update(DEFAULT_SETTINGS);
  },
};
