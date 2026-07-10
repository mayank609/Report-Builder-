import { downloadReportDocx as writeDocxDownload } from "@/lib/export/docx-export";
import { slugify } from "@/lib/utils";
import { getReportRenderContext } from "./build-report-context";

export async function downloadReportDocx(reportId: string): Promise<void> {
  const result = await getReportRenderContext(reportId);
  if (!result) throw new Error("Report not found");
  await writeDocxDownload(result.report, slugify(result.report.name));
}
