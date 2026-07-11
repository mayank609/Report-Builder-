export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type InvoiceDocType = "tax_invoice" | "proforma_invoice" | "credit_note";

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  taxRatePercent: number;
}

export interface InvoiceTaxBreakup {
  taxRatePercent: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  taxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  grandTotal: number;
  taxBreakup: InvoiceTaxBreakup[];
  isInterState: boolean;
}

export interface BillToSnapshot {
  clientId: string;
  name: string;
  companyName: string;
  address: string;
  gstin: string;
  state: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  docType: InvoiceDocType;
  status: InvoiceStatus;
  templateId: string | null;
  templateName: string | null;
  builderId: string;
  gstBranchId: string | null;
  projectId: string | null;
  projectName: string | null;
  billTo: BillToSnapshot;
  issueDate: string;
  dueDate: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  notes: string;
  termsAndConditions: string;
  totals: InvoiceTotals;
  amountPaid: number;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceInput = Omit<
  Invoice,
  "id" | "invoiceNumber" | "totals" | "createdAt" | "updatedAt"
>;
