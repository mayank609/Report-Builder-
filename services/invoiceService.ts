import { storage, STORAGE_KEYS } from "@/lib/storage";
import { generateId } from "@/lib/utils";
import { calculateInvoiceTotals } from "@/lib/gst/calculate";
import { stateCodeFromGstin, stateCodeFromName } from "@/lib/gst/india-states";
import { numberingService } from "./numberingService";
import { settingsService } from "./settingsService";
import { builderService } from "./builderService";
import type { BillToSnapshot, Invoice, InvoiceInput, InvoiceLineItem } from "@/types";
import seedInvoicesData from "@/mock-data/invoices.json";

const seedInvoices = seedInvoicesData as unknown as Invoice[];

function readCustomInvoices(): Invoice[] {
  return storage.get<Invoice[]>(STORAGE_KEYS.invoices, []);
}

function writeCustomInvoices(invoices: Invoice[]): void {
  storage.set(STORAGE_KEYS.invoices, invoices);
}

function mergeInvoices(): Invoice[] {
  const custom = readCustomInvoices();
  const customIds = new Set(custom.map((i) => i.id));
  const deletedSeedIds = new Set(storage.get<string[]>(STORAGE_KEYS.deletedSeedInvoiceIds, []));
  const seeds = seedInvoices.filter((i) => !customIds.has(i.id) && !deletedSeedIds.has(i.id));
  return [...custom, ...seeds];
}

function resolveBuyerStateCode(gstin: string, state: string): string | null {
  const fromGstin = gstin ? stateCodeFromGstin(gstin) : null;
  if (fromGstin) return fromGstin;
  return state ? stateCodeFromName(state) : null;
}

async function resolveSellerStateCode(
  builderId: string,
  gstBranchId: string | null
): Promise<string | null> {
  if (!gstBranchId) return null;
  const builder = await builderService.getById(builderId);
  return builder?.gstBranches.find((b) => b.id === gstBranchId)?.stateCode ?? null;
}

async function computeTotals(
  builderId: string,
  gstBranchId: string | null,
  billTo: BillToSnapshot,
  lineItems: InvoiceLineItem[]
) {
  const sellerStateCode = await resolveSellerStateCode(builderId, gstBranchId);
  const buyerStateCode = resolveBuyerStateCode(billTo.gstin, billTo.state);
  return calculateInvoiceTotals(lineItems, sellerStateCode, buyerStateCode);
}

export const invoiceService = {
  async list(): Promise<Invoice[]> {
    return mergeInvoices().sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getById(id: string): Promise<Invoice | null> {
    return mergeInvoices().find((i) => i.id === id) ?? null;
  },

  async create(input: InvoiceInput): Promise<Invoice> {
    const now = new Date().toISOString();
    const settings = await settingsService.get();
    const existingCount = mergeInvoices().length;
    const invoiceNumber = await numberingService.next(
      "invoice",
      settings.invoiceNumberPrefix,
      existingCount
    );
    const totals = await computeTotals(
      input.builderId,
      input.gstBranchId,
      input.billTo,
      input.lineItems
    );
    const invoice: Invoice = {
      ...input,
      id: generateId("inv"),
      invoiceNumber,
      totals,
      createdAt: now,
      updatedAt: now,
    };
    const custom = readCustomInvoices();
    writeCustomInvoices([invoice, ...custom]);
    return invoice;
  },

  async update(id: string, input: Partial<InvoiceInput>): Promise<Invoice> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Invoice ${id} not found`);
    }

    if (input.lineItems !== undefined && existing.status !== "draft") {
      throw new Error("Line items can only be edited while the invoice is a draft.");
    }

    const merged: Invoice = {
      ...existing,
      ...input,
      id: existing.id,
      invoiceNumber: existing.invoiceNumber,
      updatedAt: new Date().toISOString(),
    };
    merged.totals = await computeTotals(
      merged.builderId,
      merged.gstBranchId,
      merged.billTo,
      merged.lineItems
    );

    const custom = readCustomInvoices();
    const withoutId = custom.filter((i) => i.id !== id);
    writeCustomInvoices([merged, ...withoutId]);
    return merged;
  },

  async remove(id: string): Promise<void> {
    const custom = readCustomInvoices();
    if (custom.some((i) => i.id === id)) {
      writeCustomInvoices(custom.filter((i) => i.id !== id));
      return;
    }
    const deletedSeedIds = storage.get<string[]>(STORAGE_KEYS.deletedSeedInvoiceIds, []);
    if (!deletedSeedIds.includes(id)) {
      storage.set(STORAGE_KEYS.deletedSeedInvoiceIds, [...deletedSeedIds, id]);
    }
  },

  async stats(): Promise<{
    total: number;
    outstanding: number;
    overdueCount: number;
    recent: Invoice[];
  }> {
    const all = await this.list();
    const today = new Date().toISOString().slice(0, 10);
    const outstanding = all
      .filter((i) => i.status === "sent" || i.status === "overdue")
      .reduce((sum, i) => sum + (i.totals.grandTotal - i.amountPaid), 0);
    const overdueCount = all.filter(
      (i) => (i.status === "sent" || i.status === "overdue") && i.dueDate < today
    ).length;
    return {
      total: all.length,
      outstanding: Math.round(outstanding * 100) / 100,
      overdueCount,
      recent: all.slice(0, 5),
    };
  },
};
