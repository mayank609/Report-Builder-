"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Loader2, FileStack } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportReferenceData } from "@/features/reports/hooks/use-report-reference-data";
import {
  generateReportSchema,
  type GenerateReportFormValues,
} from "@/features/reports/lib/generate-report-schema";
import { generateReportFromContext } from "@/lib/ai/client";
import { withChart } from "@/lib/pdf/charts";
import { reportService, templateService } from "@/services";
import { formatDate } from "@/lib/utils";
import type { GeneratedReport, ReportSectionContent } from "@/types";

export function ReportGeneratorForm() {
  const router = useRouter();
  const { builders, projects, contractors, clients, engineers, templates, loading, error } =
    useReportReferenceData();
  const [generating, setGenerating] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GenerateReportFormValues>({
    resolver: zodResolver(generateReportSchema),
    defaultValues: {
      builderId: "",
      projectId: "",
      contractorId: "",
      clientId: "",
      engineerId: "",
      templateId: "",
      dateRangeStart: "",
      dateRangeEnd: "",
    },
  });

  const builderId = watch("builderId");
  const projectId = watch("projectId");

  const filteredProjects = useMemo(
    () => projects.filter((p) => !builderId || p.builderId === builderId),
    [projects, builderId]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  const availableContractors = useMemo(
    () =>
      selectedProject
        ? contractors.filter((c) => selectedProject.contractorIds.includes(c.id))
        : contractors,
    [contractors, selectedProject]
  );

  const availableEngineers = useMemo(
    () =>
      selectedProject
        ? engineers.filter((e) => selectedProject.engineerIds.includes(e.id))
        : engineers,
    [engineers, selectedProject]
  );

  useEffect(() => {
    if (selectedProject) {
      setValue("clientId", selectedProject.clientId);
      setValue("dateRangeStart", selectedProject.dailyLogs.at(0)?.date ?? selectedProject.startDate);
      setValue("dateRangeEnd", selectedProject.dailyLogs.at(-1)?.date ?? selectedProject.startDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject?.id]);

  const onSubmit = async (values: GenerateReportFormValues) => {
    setGenerating(true);
    try {
      const [template, project, builder, contractor, client, engineer] = await Promise.all([
        templateService.getById(values.templateId),
        projects.find((p) => p.id === values.projectId) ?? null,
        builders.find((b) => b.id === values.builderId) ?? null,
        contractors.find((c) => c.id === values.contractorId) ?? null,
        clients.find((c) => c.id === values.clientId) ?? null,
        engineers.find((e) => e.id === values.engineerId) ?? null,
      ]);

      if (!template || !project || !builder) {
        toast.error("Missing template or project data");
        return;
      }

      const suggestion = await generateReportFromContext({
        template,
        project,
        builderName: builder.companyName,
        clientName: client?.name ?? null,
        contractorName: contractor?.companyName ?? null,
        engineerName: engineer?.name ?? null,
        dateRangeStart: values.dateRangeStart,
        dateRangeEnd: values.dateRangeEnd,
      });

      const visibleSections = template.sections
        .filter((s) => s.visible)
        .sort((a, b) => a.order - b.order);

      const sections: ReportSectionContent[] = visibleSections.map((section) => {
        const match = suggestion.sections.find((s) => s.sectionId === section.id);
        const html = match?.html ?? "<p>No content generated for this section.</p>";
        return {
          sectionId: section.id,
          type: section.type,
          title: section.title,
          html: withChart(section.type, html, project),
          order: section.order,
        };
      });

      const reportInput: Omit<GeneratedReport, "id" | "createdAt" | "updatedAt"> = {
        name: `${project.name} - ${template.name} - ${formatDate(values.dateRangeEnd)}`,
        templateId: template.id,
        templateName: template.name,
        projectId: project.id,
        projectName: project.name,
        builderId: builder.id,
        clientId: client?.id ?? null,
        contractorId: contractor?.id ?? null,
        engineerId: engineer?.id ?? null,
        reportType: template.reportType,
        status: "completed",
        context: {
          builderId: builder.id,
          projectId: project.id,
          contractorId: contractor?.id ?? null,
          clientId: client?.id ?? null,
          engineerId: engineer?.id ?? null,
          templateId: template.id,
          dateRangeStart: values.dateRangeStart,
          dateRangeEnd: values.dateRangeEnd,
        },
        sections,
        layout: template.layout,
        aiSummary: suggestion.aiSummary,
        signatures: [],
      };

      const report = await reportService.create(reportInput);
      await templateService.incrementUsage(template.id);

      toast.success(
        suggestion.source === "gemini"
          ? "Report generated with Gemini"
          : "Report generated with smart defaults (no Gemini API key configured)"
      );
      router.push(`/reports/${report.id}/preview`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState />;
  }

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={FileStack}
        title="No published templates available"
        description="Publish a template before generating a report."
      />
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Report Configuration</CardTitle>
          <CardDescription>
            Select the project context and template to generate a report from.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Builder</Label>
            <Controller
              name="builderId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue("projectId", "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select builder" />
                  </SelectTrigger>
                  <SelectContent>
                    {builders.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.builderId && (
              <p className="text-xs text-destructive">{errors.builderId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Project</Label>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId && (
              <p className="text-xs text-destructive">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Contractor</Label>
            <Controller
              name="contractorId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select contractor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContractors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName} · {c.trade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Client</Label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Engineer</Label>
            <Controller
              name="engineerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select engineer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEngineers.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} · {e.discipline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Template</Label>
            <Controller
              name="templateId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.templateId && (
              <p className="text-xs text-destructive">{errors.templateId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dateRangeStart">Date Range Start</Label>
            <Controller
              name="dateRangeStart"
              control={control}
              render={({ field }) => <Input id="dateRangeStart" type="date" {...field} />}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dateRangeEnd">Date Range End</Label>
            <Controller
              name="dateRangeEnd"
              control={control}
              render={({ field }) => <Input id="dateRangeEnd" type="date" {...field} />}
            />
            {errors.dateRangeEnd && (
              <p className="text-xs text-destructive">{errors.dateRangeEnd.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedProject && (
        <Card className="py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Project Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{selectedProject.status.replace("_", " ")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Percent Complete</p>
              <p className="font-medium">{selectedProject.percentComplete}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Budget Spent</p>
              <p className="font-medium">
                ${selectedProject.spentBudget.toLocaleString()} / $
                {selectedProject.totalBudget.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Generating Report…
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate Report
            </>
          )}
        </Button>
      </div>
    </motion.form>
  );
}
