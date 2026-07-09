import { buildReportHtmlDocument } from "@/lib/pdf/report-html";
import { slugify } from "@/lib/utils";
import { getReportRenderContext } from "./build-report-context";

export async function downloadReportPdf(reportId: string): Promise<void> {
  const result = await getReportRenderContext(reportId);
  if (!result) throw new Error("Report not found");

  const html = buildReportHtmlDocument(result.context);
  const res = await fetch("/api/reports/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      orientation: result.report.layout.orientation,
      pageNumbers: result.report.layout.pageNumbers,
      filename: slugify(result.report.name),
    }),
  });

  if (!res.ok) throw new Error("Failed to generate PDF");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(result.report.name)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
