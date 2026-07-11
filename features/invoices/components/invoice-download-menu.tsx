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
import { downloadInvoicePdf } from "@/features/invoices/lib/download-invoice-pdf";
import { downloadInvoiceExcel } from "@/features/invoices/lib/download-invoice-excel";

type ExportFormat = "pdf" | "excel";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel (.xlsx)",
};

interface InvoiceDownloadMenuProps {
  invoiceId: string;
  variant?: "default" | "icon";
}

export function InvoiceDownloadMenu({ invoiceId, variant = "default" }: InvoiceDownloadMenuProps) {
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const busy = downloading !== null;

  const handleDownload = async (format: ExportFormat) => {
    setDownloading(format);
    try {
      if (format === "pdf") await downloadInvoicePdf(invoiceId);
      else await downloadInvoiceExcel(invoiceId);
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
