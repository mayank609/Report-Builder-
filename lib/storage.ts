/**
 * Thin LocalStorage abstraction. This is the only module that should
 * touch `window.localStorage` directly. Swap the implementation for
 * fetch()-based API calls later without changing any service call sites.
 */

const isBrowser = () => typeof window !== "undefined";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    return safeParse<T>(window.localStorage.getItem(key), fallback);
  },

  set<T>(key: string, value: T): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(key);
  },

  has(key: string): boolean {
    if (!isBrowser()) return false;
    return window.localStorage.getItem(key) !== null;
  },

  clearAll(prefix?: string): void {
    if (!isBrowser()) return;
    if (!prefix) {
      window.localStorage.clear();
      return;
    }
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => window.localStorage.removeItem(key));
  },
};

export const STORAGE_KEYS = {
  templates: "rb:templates",
  deletedSeedTemplateIds: "rb:templates:deleted-seed-ids",
  reports: "rb:reports",
  deletedSeedReportIds: "rb:reports:deleted-seed-ids",
  invoices: "rb:invoices",
  deletedSeedInvoiceIds: "rb:invoices:deleted-seed-ids",
  builderOverrides: "rb:builders:overrides",
  clientOverrides: "rb:clients:overrides",
  docCounters: "rb:doc-counters",
  settings: "rb:settings",
} as const;
