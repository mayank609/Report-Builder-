import Link from "next/link";
import { FileText, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { GeneratedReport } from "@/types";

const STATUS_VARIANT: Record<GeneratedReport["status"], "success" | "secondary" | "warning" | "destructive"> = {
  completed: "success",
  draft: "secondary",
  generating: "warning",
  failed: "destructive",
};

export function RecentReportsCard({ reports }: { reports: GeneratedReport[] }) {
  return (
    <Card className="py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center justify-between text-base">
          Recent Reports
          <Link
            href="/reports/history"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowUpRight className="size-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        {reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Generate your first report to see it here."
            className="py-8"
          />
        ) : (
          <ul className="divide-y">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/reports/${report.id}/preview`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/50 -mx-2 px-2 rounded-md"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {report.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {report.projectName} · {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[report.status]} className="shrink-0 capitalize">
                    {report.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
