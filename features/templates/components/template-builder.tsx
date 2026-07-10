"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Save, CheckCircle2, ArrowLeft, Eye } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { templateService } from "@/services";
import { TemplateDetailsForm } from "@/features/templates/components/template-details-form";
import { LayoutOptionsPanel } from "@/features/templates/components/layout-options-panel";
import { SectionBuilder } from "@/features/templates/components/section-builder";
import { AiGeneratorPanel } from "@/features/templates/components/ai-generator-panel";
import { TemplatePreviewPanel } from "@/features/templates/components/template-preview-panel";
import { createBlankTemplate, createSectionInstance } from "@/features/templates/lib/default-template";
import {
  templateFormSchema,
  type TemplateFormValues,
} from "@/features/templates/lib/template-schema";
import { SECTION_CATALOG } from "@/lib/constants";
import type { AiTemplateSuggestion, ReportTemplate } from "@/types";

interface TemplateBuilderProps {
  mode: "create" | "edit";
  templateId?: string;
  initialValues?: TemplateFormValues;
  initialAiGenerated?: boolean;
}

export function TemplateBuilder({
  mode,
  templateId,
  initialValues,
  initialAiGenerated = false,
}: TemplateBuilderProps) {
  const router = useRouter();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(initialAiGenerated);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: initialValues ?? createBlankTemplate(),
  });

  const watchedValues = watch();
  const sections = watchedValues.sections;

  const handleAiApply = (suggestion: AiTemplateSuggestion) => {
    setAiGenerated(true);
    setValue("name", suggestion.name, { shouldValidate: true });
    setValue("reportType", suggestion.reportType);
    setValue("description", suggestion.description, { shouldValidate: true });
    setValue(
      "sections",
      suggestion.sections.map((s, index) => {
        const catalogEntry = SECTION_CATALOG.find((c) => c.type === s.type);
        return createSectionInstance(
          s.type,
          s.title || catalogEntry?.defaultTitle || s.type,
          s.description || catalogEntry?.description || "",
          index
        );
      }),
      { shouldValidate: true }
    );
  };

  const persist = async (values: TemplateFormValues, status: "draft" | "published") => {
    setSaving(true);
    try {
      const payload: Omit<ReportTemplate, "id" | "createdAt" | "updatedAt" | "usageCount"> = {
        name: values.name,
        reportType: values.reportType,
        description: values.description,
        status,
        layout: values.layout,
        sections: values.sections,
        createdBy: "You",
        aiGenerated,
      };

      if (mode === "edit" && templateId) {
        await templateService.update(templateId, payload);
        toast.success("Template updated");
      } else {
        await templateService.create(payload);
        toast.success(status === "published" ? "Template published" : "Template saved as draft");
      }
      router.push("/templates");
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const onSubmitDraft = handleSubmit(
    (values) => persist(values, "draft"),
    () => toast.error("Please fix the errors before saving")
  );

  const onSubmitPublish = handleSubmit(
    (values) => persist(values, "published"),
    () => toast.error("Please fix the errors before publishing")
  );

  return (
    <div className="mx-auto max-w-[1440px] space-y-6 pb-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/templates"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Templates
          </Link>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {mode === "edit" ? "Edit Template" : "Create Template"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure details, layout, and drag-and-drop sections for your report template.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="lg:hidden" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" /> Preview
          </Button>
          <Button variant="outline" onClick={() => setAiPanelOpen(true)}>
            <Sparkles className="size-4 text-primary" /> Generate with AI
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="sections">
                Sections{sections.length > 0 ? ` (${sections.length})` : ""}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-4">
              <TemplateDetailsForm control={control} errors={errors} />
            </TabsContent>
            <TabsContent value="layout" className="mt-4">
              <LayoutOptionsPanel control={control} />
            </TabsContent>
            <TabsContent value="sections" className="mt-4">
              {errors.sections && (
                <p className="mb-3 text-xs text-destructive">{errors.sections.message}</p>
              )}
              <SectionBuilder
                sections={sections}
                onSectionsChange={(next) => setValue("sections", next, { shouldValidate: true })}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-4 h-[calc(100vh-140px)] gap-0 overflow-hidden py-0">
            <TemplatePreviewPanel values={watchedValues} className="h-full" />
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-2 px-4 py-3 md:px-6">
          <Button variant="outline" onClick={onSubmitDraft} disabled={saving}>
            <Save className="size-4" /> Save as Draft
          </Button>
          <Button onClick={onSubmitPublish} disabled={saving}>
            <CheckCircle2 className="size-4" /> {saving ? "Saving…" : "Publish Template"}
          </Button>
        </div>
      </div>

      <AiGeneratorPanel
        open={aiPanelOpen}
        onOpenChange={setAiPanelOpen}
        onApply={handleAiApply}
      />

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Live Preview</SheetTitle>
            <SheetDescription>Preview of the report template being built.</SheetDescription>
          </SheetHeader>
          <TemplatePreviewPanel values={watchedValues} className="h-full" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
