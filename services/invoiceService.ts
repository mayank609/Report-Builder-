import { generateId } from "@/lib/utils";
import { calculateInvoiceTotals } from "@/lib/gst/calculate";
import { stateCodeFromGstin, stateCodeFromName } from "@/lib/gst/india-states";
import { numberingService } from "./numberingService";
import { settingsService } from "./settingsService";
import { builderService } from "./builderService";
import type { BillToSnapshot, Invoice, InvoiceInput, InvoiceLineItem } from "@/types";
import { fetchCollection, fetchDocument, createDocument, updateDocument, deleteDocument } from "@/lib/api-client";

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
    return fetchCollection<Invoice>("invoices");
  },

  async getById(id: string): Promise<Invoice | null> {
    return fetchDocument<Invoice>("invoices", id);
  },

  async create(input: InvoiceInput): Promise<Invoice> {
    const now = new Date().toISOString();
    const settings = await settingsService.get();
    const existingCount = (await this.list()).length;
    
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
    
    const invoice = {
      ...input,
      id: generateId("inv"),
      invoiceNumber,
      totals,
      createdAt: now,
      updatedAt: now,
    };
    
    return createDocument<Invoice>("invoices", invoice);
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
      updatedAt: new Date().toISOString(),
    };
    
    merged.totals = await computeTotals(
      merged.builderId,
      merged.gstBranchId,
      merged.billTo,
      merged.lineItems
    );

    return updateDocument<Invoice>("invoices", id, merged);
  },

  async remove(id: string): Promise<void> {
    return deleteDocument("invoices", id);
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
