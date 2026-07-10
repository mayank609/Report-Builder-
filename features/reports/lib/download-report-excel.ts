import { downloadReportExcel as writeExcelDownload } from "@/lib/export/excel-export";
import { slugify } from "@/lib/utils";
import { getReportRenderContext } from "./build-report-context";

export async function downloadReportExcel(reportId: string): Promise<void> {
  const result = await getReportRenderContext(reportId);
  if (!result) throw new Error("Report not found");
  await writeExcelDownload(result.report, slugify(result.report.name));
}
