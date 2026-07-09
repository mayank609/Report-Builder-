"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { reportService } from "@/services";
import { useAsync } from "@/hooks/use-async";

export function useReports() {
  const { data, loading, error, refetch } = useAsync(() => reportService.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await reportService.remove(id);
        toast.success("Report deleted");
        refetch();
      } catch {
        toast.error("Failed to delete report");
      } finally {
        setDeletingId(null);
      }
    },
    [refetch]
  );

  return { reports: data ?? [], loading, error, refetch, remove, deletingId };
}
