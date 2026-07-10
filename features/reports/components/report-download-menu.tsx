"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadReportPdf } from "@/features/reports/lib/download-report-pdf";
import { downloadReportExcel } from "@/features/reports/lib/download-report-excel";
import { downloadReportDocx } from "@/features/reports/lib/download-report-docx";

type ExportFormat = "pdf" | "excel" | "docx";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel (.xlsx)",
  docx: "Word (.docx)",
};

interface ReportDownloadMenuProps {
  reportId: string;
  variant?: "default" | "icon";
}

export function ReportDownloadMenu({ reportId, variant = "default" }: ReportDownloadMenuProps) {
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const busy = downloading !== null;

  const handleDownload = async (format: ExportFormat) => {
    setDownloading(format);
    try {
      if (format === "pdf") await downloadReportPdf(reportId);
      else if (format === "excel") await downloadReportExcel(reportId);
      else await downloadReportDocx(reportId);
      toast.success(`${FORMAT_LABELS[format]} downloaded`);
    } catch {
      toast.error(`Failed to download ${FORMAT_LABELS[format]}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="icon" className="size-8" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          </Button>
        ) : (
          <Button size="sm" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {busy ? "Preparing…" : "Download"}
            <ChevronDown className="size-3.5" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload("pdf")} disabled={busy}>
          <FileText className="size-4" /> {FORMAT_LABELS.pdf}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("excel")} disabled={busy}>
          <FileSpreadsheet className="size-4" /> {FORMAT_LABELS.excel}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("docx")} disabled={busy}>
          <FileText className="size-4" /> {FORMAT_LABELS.docx}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
