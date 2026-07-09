"use client";

import { use } from "react";
import Link from "next/link";
import { FileX } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { templateService } from "@/services";
import { TemplateBuilder } from "@/features/templates/components/template-builder";
import type { TemplateFormValues } from "@/features/templates/lib/template-schema";

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: template, loading } = useAsync(() => templateService.getById(id), [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!template) {
    return (
      <EmptyState
        icon={FileX}
        title="Template not found"
        description="This template may have been deleted."
        action={
          <Button asChild>
            <Link href="/templates">Back to Templates</Link>
          </Button>
        }
      />
    );
  }

  const initialValues: TemplateFormValues = {
    name: template.name,
    reportType: template.reportType,
    description: template.description,
    status: template.status,
    layout: template.layout,
    sections: template.sections,
  };

  return (
    <TemplateBuilder
      mode="edit"
      templateId={template.id}
      initialValues={initialValues}
      initialAiGenerated={template.aiGenerated}
    />
  );
}
