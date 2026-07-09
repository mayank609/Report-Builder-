"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { templateService } from "@/services";
import { useAsync } from "@/hooks/use-async";

export function useTemplates() {
  const { data, loading, error, refetch } = useAsync(() => templateService.list());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await templateService.remove(id);
        toast.success("Template deleted");
        refetch();
      } catch {
        toast.error("Failed to delete template");
      } finally {
        setDeletingId(null);
      }
    },
    [refetch]
  );

  const duplicate = useCallback(
    async (id: string) => {
      try {
        await templateService.duplicate(id);
        toast.success("Template duplicated");
        refetch();
      } catch {
        toast.error("Failed to duplicate template");
      }
    },
    [refetch]
  );

  return {
    templates: data ?? [],
    loading,
    error,
    refetch,
    remove,
    duplicate,
    deletingId,
  };
}
