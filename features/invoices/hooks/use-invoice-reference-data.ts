"use client";

import { useAsync } from "@/hooks/use-async";
import { builderService, clientService, projectService, templateService } from "@/services";

export function useInvoiceReferenceData() {
  const { data, loading, error, refetch } = useAsync(async () => {
    const [builders, projects, clients, templates] = await Promise.all([
      builderService.list(),
      projectService.list(),
      clientService.list(),
      templateService.list(),
    ]);
    return { builders, projects, clients, templates };
  }, []);

  return {
    builders: data?.builders ?? [],
    projects: data?.projects ?? [],
    clients: data?.clients ?? [],
    templates: (data?.templates ?? []).filter(
      (t) => t.documentKind === "invoice" && t.status === "published"
    ),
    loading,
    error,
    refetch,
  };
}
