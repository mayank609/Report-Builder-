"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Trash2, History as HistoryIcon, Search, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports } from "@/features/reports/hooks/use-reports";
import { ReportDownloadMenu } from "@/features/reports/components/report-download-menu";
import { formatDate } from "@/lib/utils";
import type { GeneratedReport } from "@/types";

const STATUS_VARIANT: Record<GeneratedReport["status"], "success" | "secondary" | "warning" | "destructive"> = {
  completed: "success",
  draft: "secondary",
  generating: "warning",
  failed: "destructive",
};

export default function ReportHistoryPage() {
  const { reports, loading, error, refetch, remove } = useReports();
  const [search, setSearch] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.projectName.toLowerCase().includes(search.toLowerCase()) ||
          r.templateName.toLowerCase().includes(search.toLowerCase())
      ),
    [reports, search]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Report History"
        description="Browse, download, and manage previously generated reports."
        actions={
          <Button asChild>
            <Link href="/reports/generate">
              <Sparkles className="size-4" /> Generate Report
            </Link>
          </Button>
        }
      />

      {!loading && !error && reports.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState onRetry={refetch} />}

      {!loading && !error && reports.length === 0 && (
        <EmptyState
          icon={HistoryIcon}
          title="No reports generated yet"
          description="Generate your first report to see it appear here."
          action={
            <Button asChild>
              <Link href="/reports/generate">
                <Sparkles className="size-4" /> Generate Report
              </Link>
            </Button>
          }
        />
      )}

      {!loading && !error && reports.length > 0 && filtered.length === 0 && (
        <EmptyState icon={Search} title="No matching reports" description="Try a different search term." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Report Name</th>
                  <th className="px-4 py-3 font-medium">Template</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((report) => (
                  <tr key={report.id} className="transition-colors hover:bg-accent/40">
                    <td className="max-w-[240px] truncate px-4 py-3 font-medium text-foreground">
                      {report.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{report.templateName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{report.projectName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(report.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[report.status]} className="capitalize">
                        {report.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link href={`/reports/${report.id}/preview`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <ReportDownloadMenu reportId={report.id} variant="icon" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDeleteId(report.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete report?"
        description="This will permanently remove the report from your history."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await remove(pendingDeleteId);
        }}
      />
    </div>
  );
}
