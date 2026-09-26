"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { formatMoney } from "@/lib/pdf/financial-summary";
import { reportService, templateService, recordService } from "@/services";
import { formatDate } from "@/lib/utils";
import type { ReportInput, ReportSectionContent, ProjectRecord } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RECORD_TYPE_CONFIGS } from "@/types/record";

export function ReportGeneratorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId");
  const queryRecordIds = searchParams.get("recordIds");
  const { builders, projects, contractors, clients, engineers, templates, loading, error } =
    useReportReferenceData();
  const [generating, setGenerating] = useState(false);

  // Evidence / Records state
  const [availableRecords, setAvailableRecords] = useState<ProjectRecord[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

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

  // Pre-fill from query param or auto-select builder if only one
  useEffect(() => {
    if (queryProjectId && projects.length > 0) {
      const match = projects.find((p) => p.id === queryProjectId);
      if (match) {
        setValue("builderId", match.builderId);
        setValue("projectId", match.id);
        setValue("clientId", match.clientId);
        if (match.contractorIds.length > 0) {
          setValue("contractorId", match.contractorIds[0]);
        }
        if (match.engineerIds.length > 0) {
          setValue("engineerId", match.engineerIds[0]);
        }
      }
    } else if (builders.length === 1 && !builderId) {
      setValue("builderId", builders[0].id);
    }
  }, [queryProjectId, projects, builders, setValue, builderId]);

  // Load records for selected project
  useEffect(() => {
    if (!projectId) {
      setAvailableRecords([]);
      setSelectedRecordIds([]);
      return;
    }
    setRecordsLoading(true);
    recordService
      .list({ projectId })
      .then((recs) => {
        setAvailableRecords(recs);
        if (queryRecordIds) {
          const ids = queryRecordIds.split(",").filter(Boolean);
          setSelectedRecordIds(ids);
        } else {
          // By default, select all records
          setSelectedRecordIds(recs.map((r) => r.id));
        }
      })
      .catch(() => setAvailableRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [projectId, queryRecordIds]);

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

      const selectedRecords = availableRecords.filter((r) =>
        selectedRecordIds.includes(r.id)
      );

      const suggestion = await generateReportFromContext({
        template,
        project,
        builderName: builder.companyName,
        clientName: client?.name ?? null,
        contractorName: contractor?.companyName ?? null,
        engineerName: engineer?.name ?? null,
        dateRangeStart: values.dateRangeStart,
        dateRangeEnd: values.dateRangeEnd,
        projectRecords: selectedRecords,
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
          width: section.width,
        };
      });

      const reportInput: ReportInput = {
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
        status: "draft",
        version: 1,
        versionHistory: [
          {
            version: 1,
            date: new Date().toISOString(),
            action: "Report generated from project evidence",
            actor: "System",
            summary: `${selectedRecords.length} evidence records analyzed`,
          },
        ],
        sourceRecordIds: selectedRecords.map((r) => r.id),
        context: {
          builderId: builder.id,
          projectId: project.id,
          contractorId: contractor?.id ?? null,
          clientId: client?.id ?? null,
          engineerId: engineer?.id ?? null,
          templateId: template.id,
          dateRangeStart: values.dateRangeStart,
          dateRangeEnd: values.dateRangeEnd,
          recordIds: selectedRecords.map((r) => r.id),
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
          ? `Report generated with Gemini (${selectedRecords.length} evidence records synthesized)`
          : `Report generated with smart defaults (${selectedRecords.length} evidence records synthesized)`
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

      {/* Evidence & Project Records Selection */}
      {selectedProject && (
        <Card className="py-5">
          <CardHeader className="flex flex-row items-center justify-between px-5">
            <div>
              <CardTitle className="text-base">Project Evidence &amp; Records</CardTitle>
              <CardDescription>
                Select which site logs, RFIs, quality inspections, and safety records to include as source evidence.
              </CardDescription>
            </div>
            {availableRecords.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (selectedRecordIds.length === availableRecords.length) {
                    setSelectedRecordIds([]);
                  } else {
                    setSelectedRecordIds(availableRecords.map((r) => r.id));
                  }
                }}
              >
                {selectedRecordIds.length === availableRecords.length
                  ? "Deselect All"
                  : `Select All (${availableRecords.length})`}
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-5">
            {recordsLoading && <Skeleton className="h-24 w-full" />}
            {!recordsLoading && availableRecords.length === 0 && (
              <p className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
                No records found for this project. Report will use baseline project logs.
              </p>
            )}
            {!recordsLoading && availableRecords.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableRecords.map((rec) => {
                  const cfg = RECORD_TYPE_CONFIGS[rec.type] || {
                    label: rec.type,
                    prefix: "REC",
                    color: "text-foreground",
                    bgColor: "bg-muted border-border",
                  };
                  const isChecked = selectedRecordIds.includes(rec.id);
                  return (
                    <div
                      key={rec.id}
                      className={`flex items-start gap-3 rounded-lg border p-2.5 transition-colors ${
                        isChecked ? "border-primary/50 bg-primary/[0.02]" : "bg-card"
                      }`}
                    >
                      <Checkbox
                        id={`rec-${rec.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          setSelectedRecordIds((prev) =>
                            checked ? [...prev, rec.id] : prev.filter((id) => id !== rec.id)
                          );
                        }}
                        className="mt-0.5"
                      />
                      <label htmlFor={`rec-${rec.id}`} className="flex-1 cursor-pointer text-xs space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{rec.referenceNumber}</span>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${cfg.bgColor} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{rec.date}</span>
                        </div>
                        <p className="font-medium text-foreground">{rec.title}</p>
                        {rec.notes && <p className="line-clamp-1 text-muted-foreground">{rec.notes}</p>}
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{selectedRecordIds.length} of {availableRecords.length} records selected as evidence</span>
            </div>
          </CardContent>
        </Card>
      )}

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
                {formatMoney(selectedProject.spentBudget, selectedProject.finance?.snapshot.currency ?? "USD")} /{" "}
                {formatMoney(selectedProject.totalBudget, selectedProject.finance?.snapshot.currency ?? "USD")}
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
