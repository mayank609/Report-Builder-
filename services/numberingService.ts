import { storage, STORAGE_KEYS } from "@/lib/storage";

type DocCounterType = "report" | "invoice";

function readCounters(): Record<string, number> {
  return storage.get<Record<string, number>>(STORAGE_KEYS.docCounters, {});
}

export const numberingService = {
  /**
   * `minimumFloor` should be the count of documents that already exist
   * (seed + custom) so a fresh counter in a new browser never re-issues a
   * number that collides with a seeded document's display number.
   */
  async next(docType: DocCounterType, prefix: string, minimumFloor = 0): Promise<string> {
    const counters = readCounters();
    const nextValue = Math.max(counters[docType] ?? 0, minimumFloor) + 1;
    counters[docType] = nextValue;
    storage.set(STORAGE_KEYS.docCounters, counters);
    return `${prefix}-${String(nextValue).padStart(6, "0")}`;
  },
};
