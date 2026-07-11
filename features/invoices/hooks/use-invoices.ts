"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { invoiceService } from "@/services";
import { useAsync } from "@/hooks/use-async";

export function useInvoices() {
  const { data, loading, error, refetch } = useAsync(() => invoiceService.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await invoiceService.remove(id);
        toast.success("Invoice deleted");
        refetch();
      } catch {
        toast.error("Failed to delete invoice");
      } finally {
        setDeletingId(null);
      }
    },
    [refetch]
  );

  return { invoices: data ?? [], loading, error, refetch, remove, deletingId };
}
