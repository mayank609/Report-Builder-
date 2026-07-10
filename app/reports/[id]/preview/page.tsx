"use client";

import { use, useRef, useState } from "react";
import Link from "next/link";
import {
  ZoomIn,
  ZoomOut,
  Printer,
  Download,
  Maximize,
  Minimize,
  Pencil,
  RefreshCw,
  ArrowLeft,
  FileX,
  Loader2,
  PenLine,
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
import { useReportRenderContext } from "@/features/reports/hooks/use-report-render-context";
import { ReportDocumentViewer } from "@/features/reports/components/report-document-viewer";
import { ReportEditSheet } from "@/features/reports/components/report-edit-sheet";
import { ReportSignatureDialog } from "@/features/reports/components/report-signature-dialog";
import { downloadReportPdf } from "@/features/reports/lib/download-report-pdf";
import { buildReportHtmlDocument } from "@/lib/pdf/report-html";
import { withChart } from "@/lib/pdf/charts";
import { generateReportFromContext } from "@/lib/ai/client";
import { builderService, clientService, contractorService, engineerService, projectService, reportService, templateService } from "@/services";
import { formatDateTime } from "@/lib/utils";

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
  const [regenerating, setRegenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadReportPdf(data.report.id);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
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
      });

      const updatedSections = report.sections.map((section) => {
        const match = suggestion.sections.find((s) => s.sectionId === section.sectionId);
        return match ? { ...section, html: withChart(section.type, match.html, project) } : section;
      });

      await reportService.update(report.id, {
        sections: updatedSections,
        aiSummary: suggestion.aiSummary,
      });

      toast.success(
        suggestion.source === "gemini" ? "Report regenerated with Gemini" : "Report regenerated with smart defaults"
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

  const html = buildReportHtmlDocument(data.context);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/reports/history"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to History
          </Link>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">{data.report.name}</h1>
          <p className="text-xs text-muted-foreground">
            Updated {formatDateTime(data.report.updatedAt)}
            {data.report.status === "completed" && (
              <Badge variant="success" className="ml-2 align-middle">
                Completed
              </Badge>
            )}
          </p>
        </div>
      </div>

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Regenerate with AI</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setSignOpen(true)}>
              <PenLine className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sign report</TooltipContent>
        </Tooltip>

        <div className="ml-auto">
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="size-4" />
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className={fullscreen ? "bg-background p-4" : ""}>
        <ReportDocumentViewer ref={iframeRef} html={html} zoom={zoom} />
      </div>

      <ReportEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        report={data.report}
        onSaved={refetch}
      />

      <ReportSignatureDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        report={data.report}
        onSigned={refetch}
      />
    </div>
  );
}
