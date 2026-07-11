import type * as XLSXType from "xlsx";

import { formatDate } from "@/lib/utils";
import type { Invoice } from "@/types";

/** xlsx (SheetJS) is a large library; loaded on demand so it never bloats the initial page bundle. */
export async function buildInvoiceWorkbook(invoice: Invoice): Promise<XLSXType.WorkBook> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const coverRows: (string | number)[][] = [
    ["Invoice Number", invoice.invoiceNumber],
    ["Status", invoice.status],
    ["Bill To", invoice.billTo.companyName || invoice.billTo.name],
    ["GSTIN", invoice.billTo.gstin || "—"],
    ["Place of Supply", invoice.billTo.state || "—"],
    ["Issue Date", formatDate(invoice.issueDate)],
    ["Due Date", formatDate(invoice.dueDate)],
    ["Supply Type", invoice.totals.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"],
    [],
  ];
  const coverSheet = XLSX.utils.aoa_to_sheet(coverRows);
  coverSheet["!cols"] = [{ wch: 20 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, coverSheet, "Summary");

  const lineItemsAoa: (string | number)[][] = [
    ["Description", "HSN/SAC", "Qty", "Unit", "Rate", "Discount %", "Tax %", "Line Total"],
    ...invoice.lineItems.map((item) => {
      const gross = item.quantity * item.rate;
      const taxable = gross - gross * (item.discountPercent / 100);
      const total = taxable + taxable * (item.taxRatePercent / 100);
      return [
        item.description,
        item.hsnSac,
        item.quantity,
        item.unit,
        item.rate,
        item.discountPercent,
        item.taxRatePercent,
        Math.round(total * 100) / 100,
      ];
    }),
    [],
    ["Subtotal", "", "", "", "", "", "", invoice.totals.subtotal],
    ["Discount", "", "", "", "", "", "", -invoice.totals.totalDiscount],
    ["Taxable Value", "", "", "", "", "", "", invoice.totals.taxableValue],
    ["CGST", "", "", "", "", "", "", invoice.totals.totalCgst],
    ["SGST", "", "", "", "", "", "", invoice.totals.totalSgst],
    ["IGST", "", "", "", "", "", "", invoice.totals.totalIgst],
    ["Grand Total", "", "", "", "", "", "", invoice.totals.grandTotal],
  ];
  const lineItemsSheet = XLSX.utils.aoa_to_sheet(lineItemsAoa);
  lineItemsSheet["!cols"] = [
    { wch: 32 },
    { wch: 10 },
    { wch: 8 },
    { wch: 8 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, lineItemsSheet, "Line Items");

  return workbook;
}

export async function downloadInvoiceExcel(invoice: Invoice, filename: string): Promise<void> {
  const [XLSX, workbook] = await Promise.all([import("xlsx"), buildInvoiceWorkbook(invoice)]);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
