"use client";

import { useAsync } from "@/hooks/use-async";
import {
  builderService,
  clientService,
  contractorService,
  engineerService,
  projectService,
  templateService,
} from "@/services";

export function useReportReferenceData() {
  const { data, loading, error } = useAsync(async () => {
    const [builders, projects, contractors, clients, engineers, templates] = await Promise.all([
      builderService.list(),
      projectService.list(),
      contractorService.list(),
      clientService.list(),
      engineerService.list(),
      templateService.list(),
    ]);
    return { builders, projects, contractors, clients, engineers, templates };
  }, []);

  return {
    builders: data?.builders ?? [],
    projects: data?.projects ?? [],
    contractors: data?.contractors ?? [],
    clients: data?.clients ?? [],
    engineers: data?.engineers ?? [],
    templates: (data?.templates ?? []).filter((t) => t.status === "published"),
    loading,
    error,
  };
}
