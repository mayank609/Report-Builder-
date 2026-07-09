import {
  builderService,
  clientService,
  contractorService,
  engineerService,
  projectService,
  reportService,
} from "@/services";
import type { ReportRenderContext } from "@/lib/pdf/report-html";
import type { GeneratedReport } from "@/types";

export async function getReportRenderContext(
  reportId: string
): Promise<{ report: GeneratedReport; context: ReportRenderContext } | null> {
  const report = await reportService.getById(reportId);
  if (!report) return null;

  const [builder, project, client, contractor, engineer] = await Promise.all([
    builderService.getById(report.builderId),
    projectService.getById(report.projectId),
    report.clientId ? clientService.getById(report.clientId) : Promise.resolve(null),
    report.contractorId ? contractorService.getById(report.contractorId) : Promise.resolve(null),
    report.engineerId ? engineerService.getById(report.engineerId) : Promise.resolve(null),
  ]);

  const context: ReportRenderContext = {
    report,
    builderName: builder?.companyName ?? "Unknown Builder",
    builderAddress: builder ? `${builder.address}, ${builder.city}, ${builder.state}` : "",
    projectAddress: project ? `${project.address}, ${project.city}, ${project.state}` : "",
    clientName: client?.name ?? null,
    contractorName: contractor?.companyName ?? null,
    engineerName: engineer?.name ?? null,
  };

  return { report, context };
}
