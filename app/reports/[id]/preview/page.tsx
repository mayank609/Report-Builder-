"use client";

import { use, useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  ZoomIn,
  ZoomOut,
  Printer,
  Maximize,
  Minimize,
  Pencil,
  RefreshCw,
  ArrowLeft,
  FileX,
  Loader2,
  PenLine,
  CheckCircle2,
  Clock,
  History,
  ShieldCheck,
  Lock,
  Layers,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useReportRenderContext } from "@/features/reports/hooks/use-report-render-context";
import { ReportDocumentViewer } from "@/features/reports/components/report-document-viewer";
import { ReportEditSheet } from "@/features/reports/components/report-edit-sheet";
import { ReportSignatureDialog } from "@/features/reports/components/report-signature-dialog";
import { ReportDownloadMenu } from "@/features/reports/components/report-download-menu";
import { ReportVersionHistoryDialog } from "@/features/reports/components/report-version-history-dialog";
import type { ReportVersionSnapshot } from "@/lib/report-versions";
import { buildReportHtmlDocument } from "@/lib/pdf/report-html";
import { withChart } from "@/lib/pdf/charts";
import { generateReportFromContext } from "@/lib/ai/client";
import {
  builderService,
  clientService,
  contractorService,
  engineerService,
  projectService,
  reportService,
  reportVersionService,
  templateService,
  recordService,
} from "@/services";
import { formatDateTime } from "@/lib/utils";
import type { ReportStatus, ProjectRecord, ReportVersionEntry } from "@/types";
import { RECORD_TYPE_CONFIGS } from "@/types/record";

const LIFECYCLE_STEPS: Array<{ key: ReportStatus; label: string }> = [
  { key: "draft", label: "Draft" },
  { key: "in_review", label: "Review" },
  { key: "approved", label: "Approved" },
  { key: "signed", label: "Signed" },
  { key: "final", label: "Final" },
];

export default function ReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading, error, refetch } = useReportRenderContext(id);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingVersion, setViewingVersion] = useState<ReportVersionSnapshot | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sourceRecords, setSourceRecords] = useState<ProjectRecord[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load source evidence records
  useEffect(() => {
    if (data?.report?.sourceRecordIds && data.report.sourceRecordIds.length > 0) {
      recordService
        .list({ projectId: data.report.projectId })
        .then((all) => {
          const matched = all.filter((r) => data.report.sourceRecordIds.includes(r.id));
          setSourceRecords(matched);
        })
        .catch(() => setSourceRecords([]));
    }
  }, [data?.report?.sourceRecordIds, data?.report?.projectId]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const updateReportStatus = async (newStatus: ReportStatus, actionLabel: string) => {
    if (!data) return;
    setUpdatingStatus(true);
    try {
      const historyEntry: ReportVersionEntry = {
        version: data.report.version || 1,
        date: new Date().toISOString(),
        action: actionLabel,
        actor: "User",
      };

      const existingHistory = data.report.versionHistory || [];

      await reportService.update(data.report.id, {
        status: newStatus,
        versionHistory: [...existingHistory, historyEntry],
      });
      toast.success(`Report marked as ${newStatus.replace("_", " ")}`);
      refetch();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRegenerate = async () => {
    if (!data) return;
    setRegenerating(true);
    try {
      const { report } = data;
      const [template, project, builder, contractor, client, engineer] = await Promise.all([
        templateService.getById(report.templateId),
        projectService.getById(report.projectId),
        builderService.getById(report.builderId),
        report.contractorId ? contractorService.getById(report.contractorId) : Promise.resolve(null),
        report.clientId ? clientService.getById(report.clientId) : Promise.resolve(null),
        report.engineerId ? engineerService.getById(report.engineerId) : Promise.resolve(null),
      ]);

      if (!template || !project || !builder) {
        toast.error("Missing source data for regeneration");
        return;
      }

      const suggestion = await generateReportFromContext({
        template,
        project,
        builderName: builder.companyName,
        clientName: client?.name ?? null,
        contractorName: contractor?.companyName ?? null,
        engineerName: engineer?.name ?? null,
        dateRangeStart: report.context.dateRangeStart,
        dateRangeEnd: report.context.dateRangeEnd,
        projectRecords: sourceRecords,
      });

      const updatedSections = report.sections.map((section) => {
        const match = suggestion.sections.find((s) => s.sectionId === section.sectionId);
        return match ? { ...section, html: withChart(section.type, match.html, project) } : section;
      });

      const newVersion = (report.version || 1) + 1;
      const historyEntry: ReportVersionEntry = {
        version: newVersion,
        date: new Date().toISOString(),
        action: `Regenerated from ${sourceRecords.length} evidence records`,
        actor: "AI Engine",
      };

      await reportService.update(report.id, {
        sections: updatedSections,
        aiSummary: suggestion.aiSummary,
        version: newVersion,
        versionHistory: [...(report.versionHistory || []), historyEntry],
      });

      toast.success(
        suggestion.source === "gemini"
          ? `Report regenerated with Gemini (v${newVersion})`
          : `Report regenerated with smart defaults (v${newVersion})`
      );
      refetch();
    } catch {
      toast.error("Failed to regenerate report");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !data) {
    return error ? (
      <ErrorState onRetry={refetch} />
    ) : (
      <EmptyState
        icon={FileX}
        title="Report not found"
        description="This report may have been deleted."
        action={
          <Button asChild>
            <Link href="/reports/history">Back to History</Link>
          </Button>
        }
      />
    );
  }

  // An archived version is rendered through the exact same pipeline, read-only.
  const html = buildReportHtmlDocument(
    viewingVersion
      ? {
          ...data.context,
          report: {
            ...data.context.report,
            name: viewingVersion.name,
            sections: viewingVersion.sections,
            aiSummary: viewingVersion.aiSummary,
            layout: viewingVersion.layout,
            signatures: viewingVersion.signatures,
            status: viewingVersion.status,
            version: viewingVersion.version,
          },
        }
      : data.context
  );
  const currentStatus = data.report.status || "draft";
  const currentVersion = data.report.version || 1;

  // Determine active step index
  const activeStepIdx = LIFECYCLE_STEPS.findIndex((s) => s.key === currentStatus);
  const isFinal = currentStatus === "final";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* Top Bar Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/reports/history"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to History
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">{data.report.name}</h1>
            <Badge variant="outline" className="font-mono text-xs font-semibold">
              v{currentVersion}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {data.report.reportNumber} · Updated {formatDateTime(data.report.updatedAt)}
          </p>
        </div>

        {/* Lifecycle Stepper & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Version History Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="size-3.5" /> History ({data.report.versionHistory?.length || 1})
          </Button>

          {/* Source Evidence Button */}
          {sourceRecords.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs border-primary/30 text-primary"
              onClick={() => setEvidenceOpen(true)}
            >
              <Layers className="size-3.5" /> Evidence ({sourceRecords.length})
            </Button>
          )}

          {/* Lifecycle Progression Buttons */}
          {currentStatus === "draft" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => updateReportStatus("in_review", "Submitted for review")}
              disabled={updatingStatus}
            >
              <Send className="size-3.5" /> Submit for Review
            </Button>
          )}

          {currentStatus === "in_review" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => updateReportStatus("approved", "Approved by reviewer")}
              disabled={updatingStatus}
            >
              <ShieldCheck className="size-3.5" /> Approve Report
            </Button>
          )}

          {currentStatus === "approved" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setSignOpen(true)}
              disabled={updatingStatus}
            >
              <PenLine className="size-3.5" /> Sign Report
            </Button>
          )}

          {currentStatus === "signed" && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => updateReportStatus("final", "Report finalized & locked")}
              disabled={updatingStatus}
            >
              <Lock className="size-3.5" /> Finalize &amp; Lock
            </Button>
          )}

          {isFinal && (
            <Badge variant="success" className="h-8 gap-1 px-3 text-xs">
              <CheckCircle2 className="size-3.5" /> Final &amp; Locked
            </Badge>
          )}
        </div>
      </div>

      {/* Lifecycle Progress Pipeline */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 shadow-sm overflow-x-auto text-xs">
        <div className="flex items-center gap-1 sm:gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = activeStepIdx > idx;
            const isCurrent = activeStepIdx === idx;
            return (
              <div key={step.key} className="flex items-center gap-1 sm:gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    isCurrent
                      ? "bg-primary text-primary-foreground font-semibold"
                      : isCompleted
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground bg-muted"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Clock className="size-3 animate-pulse" />
                  ) : null}
                  <span>{step.label}</span>
                </div>
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <span className="text-muted-foreground/40 font-mono text-[10px]">→</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden text-[11px] text-muted-foreground md:block">
          {isFinal ? "Document is locked against accidental edits" : "Advance lifecycle before client dispatch"}
        </div>
      </div>

      {/* Document Viewer Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 rounded-lg border bg-background p-1.5 shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
              <ZoomOut className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <span className="w-12 text-center text-xs font-medium text-muted-foreground">{zoom}%</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(150, z + 10))}>
              <ZoomIn className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>

        <div className="mx-1 h-6 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handlePrint}>
              <Printer className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Print</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fullscreen</TooltipContent>
        </Tooltip>

        {/* Edit Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}
              disabled={isFinal}
              title={isFinal ? "Report is finalized and locked" : "Edit report"}
            >
              <Pencil className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFinal ? "Locked against editing" : "Edit Sections"}</TooltipContent>
        </Tooltip>

        {/* Regenerate AI Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRegenerate}
              disabled={regenerating || isFinal}
            >
              {regenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isFinal ? "Locked against regeneration" : "Regenerate with AI from evidence"}
          </TooltipContent>
        </Tooltip>

        {/* Sign Report Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSignOpen(true)}>
              <PenLine className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sign report</TooltipContent>
        </Tooltip>

        <div className="ml-auto">
          <ReportDownloadMenu reportId={data.report.id} />
        </div>
      </div>

      {viewingVersion && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">
          <p>
            <strong>Viewing v{viewingVersion.version}</strong> — read-only snapshot archived{" "}
            {formatDateTime(viewingVersion.capturedAt)}. The current version is v{currentVersion}.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const restored = await reportVersionService.restore(data.report.id, viewingVersion.version);
                  toast.success(`Restored v${viewingVersion.version} as v${restored.version}. Re-approval required.`);
                  setViewingVersion(null);
                  refetch();
                } catch (error) {
                  toast.error((error as Error).message);
                }
              }}
            >
              Restore this version
            </Button>
            <Button size="sm" onClick={() => setViewingVersion(null)}>
              Back to current
            </Button>
          </div>
        </div>
      )}

      {/* Embedded Document Frame */}
      <div ref={containerRef} className={fullscreen ? "bg-background p-4" : ""}>
        <ReportDocumentViewer ref={iframeRef} html={html} zoom={zoom} />
      </div>

      {/* Edit Sheet */}
      <ReportEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        report={data.report}
        onSaved={async () => {
          // The server archived the previous version and bumped the number.
          // Content edited after approval must be re-approved.
          if (["approved", "signed", "final"].includes(currentStatus)) {
            const fresh = await reportService.getById(data.report.id);
            await reportService.update(data.report.id, {
              status: "in_review",
              versionHistory: [
                ...(fresh?.versionHistory || data.report.versionHistory || []),
                {
                  version: fresh?.version ?? currentVersion + 1,
                  date: new Date().toISOString(),
                  action: "Reset to In Review after revision",
                  actor: "User",
                },
              ],
            });
            toast.info(`Revision saved as v${fresh?.version ?? currentVersion + 1}; re-approval required`);
          }
          refetch();
        }}
      />

      {/* Signature Dialog */}
      <ReportSignatureDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        report={data.report}
        onSigned={() => {
          updateReportStatus("signed", "Digitally signed by authorized personnel");
        }}
      />

      {/* Version History */}
      <ReportVersionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        report={data.report}
        onView={setViewingVersion}
        onRestored={() => {
          setViewingVersion(null);
          refetch();
        }}
      />

      {/* Source Traceability Evidence Modal */}
      <Dialog open={evidenceOpen} onOpenChange={setEvidenceOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-4 text-primary" /> Source Evidence &amp; Traceability
            </DialogTitle>
            <DialogDescription>
              The {sourceRecords.length} factual field records analyzed to write and verify this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {sourceRecords.map((rec) => {
              const cfg = RECORD_TYPE_CONFIGS[rec.type] || {
                label: rec.type,
                prefix: "REC",
                color: "text-foreground",
                bgColor: "bg-muted border-border",
              };
              return (
                <div key={rec.id} className="rounded-lg border p-3 bg-card space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{rec.referenceNumber}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${cfg.bgColor} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{rec.date}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {rec.status}
                    </Badge>
                  </div>
                  <h4 className="font-semibold text-foreground">{rec.title}</h4>
                  {rec.notes && <p className="text-muted-foreground line-clamp-2">{rec.notes}</p>}
                  {rec.responsiblePerson && (
                    <p className="text-[11px] text-muted-foreground">
                      Responsible: <span className="font-medium text-foreground">{rec.responsiblePerson}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
