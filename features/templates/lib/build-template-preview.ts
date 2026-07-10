import { buildReportHtmlDocument, type ReportRenderContext } from "@/lib/pdf/report-html";
import { getSampleSectionHtml } from "@/lib/pdf/sample-section-content";
import { withChart } from "@/lib/pdf/charts";
import { SAMPLE_PROJECT } from "@/lib/pdf/sample-project";
import type { TemplateFormValues } from "./template-schema";

/**
 * Renders the template being built as a full report document, using
 * generic sample data in place of real project data. Uses the exact same
 * HTML builder as real generated reports and PDF export, so what the user
 * sees while building the template is a faithful preview of the final
 * output's structure and formatting.
 */
export function buildTemplatePreviewHtml(values: TemplateFormValues): string {
  const today = new Date().toISOString().slice(0, 10);
  const visibleSections = [...values.sections]
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const ctx: ReportRenderContext = {
    report: {
      id: "preview",
      name: values.name || "Untitled Report Template",
      templateId: "preview",
      templateName: values.name || "Untitled Template",
      projectId: "preview",
      projectName: "Sample Project",
      builderId: "preview",
      clientId: null,
      contractorId: null,
      engineerId: null,
      reportType: values.reportType,
      status: "draft",
      context: {
        builderId: "preview",
        projectId: "preview",
        contractorId: null,
        clientId: null,
        engineerId: null,
        templateId: "preview",
        dateRangeStart: today,
        dateRangeEnd: today,
      },
      sections: visibleSections.map((s) => ({
        sectionId: s.id,
        type: s.type,
        title: s.title,
        html: withChart(s.type, getSampleSectionHtml(s.type), SAMPLE_PROJECT),
        order: s.order,
      })),
      layout: values.layout,
      aiSummary: "",
      signatures: [],
      createdAt: today,
      updatedAt: today,
    },
    builderName: "Your Company Name",
    builderAddress: "123 Builder Ave, Your City, ST",
    projectAddress: "456 Project Site Rd, Sample City, ST",
    clientName: "Sample Client Co.",
    contractorName: "Sample Contractor LLC",
    engineerName: "Jane Engineer, PE",
  };

  return buildReportHtmlDocument(ctx);
}
