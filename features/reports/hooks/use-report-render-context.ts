"use client";

import { useAsync } from "@/hooks/use-async";
import { getReportRenderContext } from "@/features/reports/lib/build-report-context";

export function useReportRenderContext(reportId: string) {
  return useAsync(() => getReportRenderContext(reportId), [reportId]);
}
