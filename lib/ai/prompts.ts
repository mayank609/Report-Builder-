import { SECTION_CATALOG } from "@/lib/constants";
import type { DocumentKind, Project, ProjectRecord, ReportTemplate } from "@/types";

const SECTION_TYPE_LIST = SECTION_CATALOG.map((s) => s.type).join(", ");
const REPORT_TYPE_LIST =
  "daily_progress, weekly_progress, monthly_progress, inspection, safety_audit, quality_audit, material_delivery, final_completion, custom";

export function buildTemplateGenerationPrompt(userPrompt: string): string {
  return `You are an expert construction reporting consultant helping design a report template for a construction SaaS platform.

User request: "${userPrompt}"

Design a professional report template that satisfies this request. Respond with STRICT JSON only (no markdown fences, no commentary) matching exactly this shape:

{
  "name": string,
  "reportType": one of [${REPORT_TYPE_LIST}],
  "description": string (1-2 sentences),
  "sections": [
    { "type": one of [${SECTION_TYPE_LIST}], "title": string, "description": string }
  ],
  "recommendedTables": string[] (names of tables/data grids that should appear, e.g. "Material Usage Table"),
  "formattingNotes": string (guidance on layout, fonts, tone),
  "summaryPrompts": string[] (2-4 prompt fragments that could be used to ask an AI to summarize this report's data)
}

Choose 5 to 10 relevant sections in a sensible order. Only use section types from the provided list. Ensure the JSON is valid and parses with JSON.parse.`;
}

export function buildReportGenerationPrompt(params: {
  template: ReportTemplate;
  project: Project;
  builderName: string;
  clientName: string | null;
  contractorName: string | null;
  engineerName: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  projectRecords?: ProjectRecord[];
}): string {
  const {
    template,
    project,
    builderName,
    clientName,
    contractorName,
    engineerName,
    dateRangeStart,
    dateRangeEnd,
    projectRecords = [],
  } = params;

  const visibleSections = template.sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  return `You are an expert construction report writer generating a formal, professional construction progress report.

Template: "${template.name}" (${template.reportType})
Report period: ${dateRangeStart} to ${dateRangeEnd}

Project data (JSON):
${JSON.stringify(
  {
    project: {
      name: project.name,
      projectCode: project.projectCode,
      type: project.type,
      status: project.status,
      address: `${project.address}, ${project.city}, ${project.state}`,
      startDate: project.startDate,
      estimatedEndDate: project.estimatedEndDate,
      percentComplete: project.percentComplete,
      totalBudget: project.totalBudget,
      spentBudget: project.spentBudget,
      description: project.description,
    },
    builder: builderName,
    client: clientName,
    contractor: contractorName,
    engineer: engineerName,
    materialUsage: project.materialUsage,
    equipment: project.equipment,
    labour: project.labour,
    budgetBreakdown: project.budgetBreakdown,
    // Authoritative money figures from the Finance module (when linked)
    financeSnapshot: project.finance
      ? {
          syncedAt: project.finance.syncedAt,
          currency: project.finance.snapshot.currency,
          contract: project.finance.snapshot.contract,
          budget: project.finance.snapshot.budget,
          billing: project.finance.snapshot.billing,
          profitability: project.finance.snapshot.profitability,
          pendingChangeOrders: project.finance.snapshot.changeOrders.filter(
            (co) => co.status === "pending"
          ),
        }
      : null,
    milestones: project.milestones,
    dailyLogs: project.dailyLogs.filter(
      (log) => log.date >= dateRangeStart && log.date <= dateRangeEnd
    ),
    projectRecords: projectRecords.map((r) => ({
      referenceNumber: r.referenceNumber,
      type: r.type,
      date: r.date,
      status: r.status,
      priority: r.priority,
      responsiblePerson: r.responsiblePerson,
      title: r.title,
      notes: r.notes,
      data: r.data,
    })),
  },
  null,
  2
)}

Sections to generate, in order: ${visibleSections
    .map((s) => `${s.type} ("${s.title}")`)
    .join(", ")}

Respond with STRICT JSON only (no markdown fences, no commentary) matching exactly this shape:

{
  "sections": [
    { "sectionId": string (must equal one of: ${visibleSections
      .map((s) => `"${s.id}"`)
      .join(", ")}), "html": string }
  ],
  "aiSummary": string (a 2-4 sentence executive summary of overall project health and this period's progress)
}

For each section's "html" field, write clean, semantic HTML fragment content (use <p>, <table class="report-table">, <ul>, <strong> as appropriate) suitable for direct embedding in a printed PDF report. Use tables for structured data like materials, budget, labour, equipment, and milestones.
IMPORTANT: When projectRecords are provided above (e.g. RFIs, Inspections, HSE safety items, Site Instructions, Change Orders, Punch Lists), explicitly cite their reference numbers (e.g. RFI-0001, INSP-0002, HSE-0001, CO-0001) as factual evidence in the relevant sections. When financeSnapshot is present it is the authoritative source for all money figures (use its currency, not dollars). For a "financial_summary" section, the exact figures are rendered automatically from financeSnapshot — write ONLY 2-4 sentences of analytical commentary (risks, trends, recommended actions) without repeating a table. Be specific and reference the real data provided above — do not invent facts. Keep each section concise but informative (60-180 words of prose plus any tables).`;
}

/** Truncated so a large uploaded document doesn't blow the prompt token budget. */
const MAX_IMPORT_TEXT_CHARS = 12000;

export function buildTemplateImportPrompt(
  extractedText: string,
  documentKind: DocumentKind
): string {
  const text = extractedText.slice(0, MAX_IMPORT_TEXT_CHARS);

  if (documentKind === "invoice") {
    return `You are an expert at reading real-world invoices for a construction SaaS platform. A user uploaded a Word/PDF document they already use as an invoice. Extract a reusable invoice template from it.

Document text (may include OCR/extraction noise, ignore garbled fragments):
"""
${text}
"""

Respond with STRICT JSON only (no markdown fences, no commentary) matching exactly this shape:

{
  "name": string (a short name for this invoice template, e.g. "Standard Tax Invoice"),
  "description": string (1-2 sentences),
  "termsAndConditions": string (the payment/terms text found in the document, or a sensible professional default if none is present),
  "notes": string (any standing notes/footer text found in the document, or a short thank-you note if none is present),
  "formattingNotes": string (guidance on layout, fonts, tone based on what the document looks like),
  "detectedGstin": string or null (a 15-character Indian GSTIN found in the document text, else null)
}

Ensure the JSON is valid and parses with JSON.parse.`;
  }

  return `You are an expert construction reporting consultant. A user uploaded a Word/PDF document they already use as a report. Extract a reusable report template structure from it.

Document text (may include OCR/extraction noise, ignore garbled fragments):
"""
${text}
"""

Respond with STRICT JSON only (no markdown fences, no commentary) matching exactly this shape:

{
  "name": string,
  "reportType": one of [${REPORT_TYPE_LIST}],
  "description": string (1-2 sentences),
  "sections": [
    { "type": one of [${SECTION_TYPE_LIST}], "title": string, "description": string }
  ],
  "recommendedTables": string[],
  "formattingNotes": string,
  "summaryPrompts": string[]
}

Infer 5 to 12 sections from the headings/structure present in the document, in the order they appear. Only use section types from the provided list — pick the closest match for anything that doesn't map exactly. Ensure the JSON is valid and parses with JSON.parse.`;
}
