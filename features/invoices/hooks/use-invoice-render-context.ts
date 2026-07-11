"use client";

import { useAsync } from "@/hooks/use-async";
import { getInvoiceRenderContext } from "@/features/invoices/lib/build-invoice-context";

export function useInvoiceRenderContext(invoiceId: string) {
  return useAsync(() => getInvoiceRenderContext(invoiceId), [invoiceId]);
}
