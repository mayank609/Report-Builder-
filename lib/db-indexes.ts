import type { Db } from "mongodb";
import { PUBLIC_COLLECTIONS } from "./collections";

/**
 * Idempotent index setup, run once per server process on first connect.
 * Unique indexes are the last line of defence for identifiers: even if two
 * writes race, the database rejects the duplicate instead of storing it.
 * Failures (e.g. pre-existing duplicate data) are logged, never fatal.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  const tasks: Promise<unknown>[] = PUBLIC_COLLECTIONS.map((name) =>
    db.collection(name).createIndex({ id: 1 }, { unique: true, name: "uniq_id" })
  );
  tasks.push(
    db.collection("invoices").createIndex(
      { invoiceNumber: 1 },
      { unique: true, name: "uniq_invoice_number", partialFilterExpression: { invoiceNumber: { $type: "string" } } }
    ),
    db.collection("reports").createIndex(
      { reportNumber: 1 },
      { unique: true, name: "uniq_report_number", partialFilterExpression: { reportNumber: { $type: "string" } } }
    ),
    db.collection("report_versions").createIndex(
      { reportId: 1, version: -1 },
      { unique: true, name: "uniq_report_version" }
    ),
    db.collection("records").createIndex({ projectId: 1, date: -1 }, { name: "project_date" }),
    db.collection("finance_snapshots").createIndex({ reportProjectId: 1, receivedAt: -1 }, { name: "project_received" })
  );

  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === "rejected") console.warn("ensureIndexes:", (result.reason as Error)?.message);
  }
}
