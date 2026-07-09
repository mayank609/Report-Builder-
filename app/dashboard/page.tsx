"use client";

import Link from "next/link";
import { FileStack, FileCheck2, FilePenLine, Sparkles, Plus } from "lucide-react";
import { motion } from "framer-motion";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { analyticsService } from "@/services";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { RecentReportsCard } from "@/features/dashboard/components/recent-reports-card";
import { TopTemplatesCard } from "@/features/dashboard/components/top-templates-card";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useAsync(() =>
    analyticsService.getDashboardAnalytics()
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your report templates and generated reports."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/templates/new">
                <Plus className="size-4" /> New Template
              </Link>
            </Button>
            <Button asChild>
              <Link href="/reports/generate">
                <Sparkles className="size-4" /> Generate Report
              </Link>
            </Button>
          </>
        }
      />

      {loading && <DashboardSkeleton />}

      {!loading && error && <ErrorState onRetry={refetch} />}

      {!loading && !error && data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Templates"
              value={data.totalTemplates}
              icon={FileStack}
              trend={`${data.publishedTemplates} published`}
              trendDirection="up"
            />
            <StatCard
              label="Generated Reports"
              value={data.generatedReports}
              icon={FileCheck2}
              trend={`${data.reportsThisMonth} this month`}
              trendDirection="up"
            />
            <StatCard
              label="Draft Templates"
              value={data.draftTemplates}
              icon={FilePenLine}
              trend={data.draftTemplates > 0 ? "Needs review" : "All clear"}
              trendDirection={data.draftTemplates > 0 ? "neutral" : "up"}
            />
            <StatCard
              label="Recent Reports"
              value={data.recentReports.length}
              icon={Sparkles}
              trend="Last 5 generated"
              trendDirection="neutral"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <RecentReportsCard reports={data.recentReports} />
            <TopTemplatesCard templates={data.topTemplates} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
