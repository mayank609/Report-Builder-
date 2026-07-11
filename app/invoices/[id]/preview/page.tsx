"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ZoomIn,
  ZoomOut,
  Printer,
  Maximize,
  Minimize,
  ArrowLeft,
  FileX,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInvoiceRenderContext } from "@/features/invoices/hooks/use-invoice-render-context";
import { ReportDocumentViewer } from "@/features/reports/components/report-document-viewer";
import { InvoiceDownloadMenu } from "@/features/invoices/components/invoice-download-menu";
import { buildInvoiceHtmlDocument } from "@/lib/pdf/invoice-html";
import { invoiceService } from "@/services";
import { formatDateTime } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

export default function InvoicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error, refetch } = useInvoiceRenderContext(id);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
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

  const handleStatusChange = async (status: InvoiceStatus) => {
    if (!data) return;
    setStatusSaving(true);
    try {
      await invoiceService.update(data.context.invoice.id, { status });
      toast.success("Invoice status updated");
      refetch();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusSaving(false);
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
        title="Invoice not found"
        description="This invoice may have been deleted."
        action={
          <Button asChild>
            <Link href="/invoices">Back to Invoices</Link>
          </Button>
        }
      />
    );
  }

  const { invoice } = data.context;
  const html = buildInvoiceHtmlDocument(data.context);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/invoices"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Invoices
          </Link>
          <h1 className="text-lg font-semibold text-foreground sm:text-xl">{invoice.invoiceNumber}</h1>
          <p className="text-xs text-muted-foreground">Updated {formatDateTime(invoice.updatedAt)}</p>
        </div>
        <Select
          value={invoice.status}
          onValueChange={(v) => handleStatusChange(v as InvoiceStatus)}
          disabled={statusSaving}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
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
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>

        <div className="ml-auto">
          <InvoiceDownloadMenu invoiceId={invoice.id} />
        </div>
      </div>

      <div ref={containerRef} className={fullscreen ? "bg-background p-4" : ""}>
        <ReportDocumentViewer ref={iframeRef} html={html} zoom={zoom} />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete invoice?"
        description="This will permanently remove the invoice."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await invoiceService.remove(invoice.id);
          toast.success("Invoice deleted");
          router.push("/invoices");
        }}
      />
    </div>
  );
}
