import type { InvoiceLineItem, InvoiceTaxBreakup, InvoiceTotals } from "@/types";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function lineItemTaxableValue(item: InvoiceLineItem): number {
  const gross = item.quantity * item.rate;
  const discount = gross * (item.discountPercent / 100);
  return gross - discount;
}

export function lineItemTotal(item: InvoiceLineItem): number {
  const taxable = lineItemTaxableValue(item);
  return taxable + taxable * (item.taxRatePercent / 100);
}

/**
 * Splits tax into CGST+SGST for intra-state supply, or IGST for inter-state
 * supply, per Indian GST rules. Falls back to intra-state (CGST+SGST) if
 * either state code is unknown, since that is the more common local case.
 */
export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  sellerStateCode: string | null,
  buyerStateCode: string | null
): InvoiceTotals {
  const isInterState = Boolean(
    sellerStateCode && buyerStateCode && sellerStateCode !== buyerStateCode
  );

  let subtotal = 0;
  let totalDiscount = 0;
  const byRate = new Map<number, number>();

  for (const item of lineItems) {
    const gross = item.quantity * item.rate;
    const discount = gross * (item.discountPercent / 100);
    const taxable = gross - discount;
    subtotal += gross;
    totalDiscount += discount;
    byRate.set(item.taxRatePercent, (byRate.get(item.taxRatePercent) ?? 0) + taxable);
  }

  const taxBreakup: InvoiceTaxBreakup[] = Array.from(byRate.entries())
    .sort(([a], [b]) => a - b)
    .map(([taxRatePercent, taxableValue]) => {
      const totalTaxForRate = taxableValue * (taxRatePercent / 100);
      if (isInterState) {
        return {
          taxRatePercent,
          taxableValue: round2(taxableValue),
          cgst: 0,
          sgst: 0,
          igst: round2(totalTaxForRate),
        };
      }
      const half = totalTaxForRate / 2;
      return {
        taxRatePercent,
        taxableValue: round2(taxableValue),
        cgst: round2(half),
        sgst: round2(half),
        igst: 0,
      };
    });

  const taxableValue = round2(taxBreakup.reduce((sum, b) => sum + b.taxableValue, 0));
  const totalCgst = round2(taxBreakup.reduce((sum, b) => sum + b.cgst, 0));
  const totalSgst = round2(taxBreakup.reduce((sum, b) => sum + b.sgst, 0));
  const totalIgst = round2(taxBreakup.reduce((sum, b) => sum + b.igst, 0));
  const totalTax = round2(totalCgst + totalSgst + totalIgst);

  return {
    subtotal: round2(subtotal),
    totalDiscount: round2(totalDiscount),
    taxableValue,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal: round2(taxableValue + totalTax),
    taxBreakup,
    isInterState,
  };
}
