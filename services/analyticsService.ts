import { templateService } from "./templateService";
import { reportService } from "./reportService";
import type { GeneratedReport, ReportTemplate } from "@/types";

export interface DashboardAnalytics {
  totalTemplates: number;
  publishedTemplates: number;
  draftTemplates: number;
  generatedReports: number;
  reportsThisMonth: number;
  recentReports: GeneratedReport[];
  topTemplates: ReportTemplate[];
  reportsByType: { type: string; count: number }[];
}

export const analyticsService = {
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    const [templates, reports] = await Promise.all([
      templateService.list(),
      reportService.list(),
    ]);

    const now = new Date();
    const reportsThisMonth = reports.filter((r) => {
      const created = new Date(r.createdAt);
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    }).length;

    const typeCounts = new Map<string, number>();
    for (const report of reports) {
      typeCounts.set(report.reportType, (typeCounts.get(report.reportType) ?? 0) + 1);
    }

    return {
      totalTemplates: templates.length,
      publishedTemplates: templates.filter((t) => t.status === "published").length,
      draftTemplates: templates.filter((t) => t.status === "draft").length,
      generatedReports: reports.length,
      reportsThisMonth,
      recentReports: reports.slice(0, 5),
      topTemplates: [...templates].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5),
      reportsByType: Array.from(typeCounts.entries()).map(([type, count]) => ({
        type,
        count,
      })),
    };
  },
};
