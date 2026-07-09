import { GoogleGenerativeAI } from "@google/generative-ai";

import { SECTION_CATALOG } from "@/lib/constants";
import { buildReportGenerationPrompt, buildTemplateGenerationPrompt } from "./prompts";
import type {
  AiReportSuggestion,
  AiTemplateSuggestion,
  Project,
  ReportTemplate,
} from "@/types";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function resolveApiKey(headerKey?: string | null): string | null {
  const trimmed = headerKey?.trim();
  if (trimmed) return trimmed;
  return process.env.GEMINI_API_KEY?.trim() || null;
}

async function callGemini(apiKey: string, prompt: string): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
}

const VALID_SECTION_TYPES = new Set(SECTION_CATALOG.map((s) => s.type));

export async function generateTemplateSuggestion(
  userPrompt: string,
  apiKey: string | null
): Promise<AiTemplateSuggestion> {
  if (apiKey) {
    try {
      const raw = (await callGemini(
        apiKey,
        buildTemplateGenerationPrompt(userPrompt)
      )) as Partial<AiTemplateSuggestion>;

      const sections = (raw.sections ?? [])
        .filter((s) => VALID_SECTION_TYPES.has(s.type))
        .map((s) => ({
          type: s.type,
          title: s.title || s.type,
          description: s.description || "",
        }));

      if (sections.length > 0 && raw.name) {
        return {
          name: raw.name,
          reportType: raw.reportType || "custom",
          description: raw.description || "",
          sections,
          recommendedTables: raw.recommendedTables ?? [],
          formattingNotes: raw.formattingNotes ?? "",
          summaryPrompts: raw.summaryPrompts ?? [],
          source: "gemini",
        };
      }
    } catch {
      // fall through to local fallback generator below
    }
  }

  return buildFallbackTemplateSuggestion(userPrompt);
}

export async function generateReportSuggestion(params: {
  template: ReportTemplate;
  project: Project;
  builderName: string;
  clientName: string | null;
  contractorName: string | null;
  engineerName: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  apiKey: string | null;
}): Promise<AiReportSuggestion> {
  const { apiKey, ...rest } = params;

  if (apiKey) {
    try {
      const raw = (await callGemini(
        apiKey,
        buildReportGenerationPrompt(rest)
      )) as Partial<AiReportSuggestion>;

      if (raw.sections && raw.sections.length > 0) {
        return {
          sections: raw.sections,
          aiSummary: raw.aiSummary || "",
          source: "gemini",
        };
      }
    } catch {
      // fall through to local fallback generator below
    }
  }

  return buildFallbackReportSuggestion(rest);
}

/**
 * Deterministic, no-API-key-required generator so the AI features remain
 * fully functional out of the box. Used whenever no Gemini key is
 * configured or a live call fails for any reason.
 */
function buildFallbackTemplateSuggestion(userPrompt: string): AiTemplateSuggestion {
  const lower = userPrompt.toLowerCase();

  const isWeekly = /weekly/.test(lower);
  const isSafety = /safety|audit|inspection/.test(lower);
  const isBudget = /budget|cost|financial/.test(lower);

  const reportType = isSafety
    ? "safety_audit"
    : isWeekly
      ? "weekly_progress"
      : "daily_progress";

  const baseSections: AiTemplateSuggestion["sections"] = [
    {
      type: "project_information",
      title: "Project Information",
      description: "Core project identifiers, address, and current status.",
    },
    {
      type: "builder_information",
      title: "Builder Information",
      description: "General contractor company and licensing details.",
    },
    {
      type: isWeekly ? "weekly_progress" : "daily_progress",
      title: isWeekly ? "Weekly Progress Summary" : "Daily Progress Summary",
      description: "Narrative summary of work completed during the reporting period.",
    },
    {
      type: "labour",
      title: "Labour on Site",
      description: "Crew headcount and hours logged by trade.",
    },
    {
      type: "material_usage",
      title: "Material Usage",
      description: "Planned vs. used quantities for key materials.",
    },
  ];

  if (isBudget) {
    baseSections.push({
      type: "budget",
      title: "Budget Status",
      description: "Budget allocation and spend by category.",
    });
  }

  if (isSafety) {
    baseSections.push({
      type: "recommendations",
      title: "Safety Findings & Recommendations",
      description: "Observed hazards, compliance notes, and corrective actions.",
    });
  }

  baseSections.push(
    {
      type: "images",
      title: "Site Photos",
      description: "Photographic evidence of progress.",
    },
    {
      type: "ai_summary",
      title: "AI Summary",
      description: "AI-generated executive summary of the reporting period.",
    },
    {
      type: "signature",
      title: "Sign-Off",
      description: "Supervisor and inspector signatures.",
    }
  );

  return {
    name: userPrompt.length > 60 ? `${userPrompt.slice(0, 57)}...` : userPrompt || "AI Generated Report Template",
    reportType,
    description: `Auto-generated template based on: "${userPrompt}"`,
    sections: baseSections,
    recommendedTables: [
      "Material Usage Table",
      "Labour Summary Table",
      ...(isBudget ? ["Budget Breakdown Table"] : []),
    ],
    formattingNotes:
      "Use a clean sans-serif font, generous whitespace, and a single accent color for headers and table borders.",
    summaryPrompts: [
      "Summarize overall progress against the schedule.",
      "Highlight any safety incidents or delays.",
      "Note material or labour shortages requiring attention.",
    ],
    source: "fallback",
  };
}

function buildFallbackReportSuggestion(params: {
  template: ReportTemplate;
  project: Project;
  builderName: string;
  clientName: string | null;
  contractorName: string | null;
  engineerName: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
}): AiReportSuggestion {
  const { template, project, dateRangeStart, dateRangeEnd } = params;
  const visibleSections = template.sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const logsInRange = project.dailyLogs.filter(
    (log) => log.date >= dateRangeStart && log.date <= dateRangeEnd
  );

  const sections = visibleSections.map((section) => ({
    sectionId: section.id,
    html: renderFallbackSectionHtml(section.type, project, logsInRange, params),
  }));

  return {
    sections,
    aiSummary: `${project.name} is currently ${project.percentComplete}% complete and ${project.status.replace(
      "_",
      " "
    )}. Budget utilization stands at ${Math.round(
      (project.spentBudget / project.totalBudget) * 100
    )}% of the total allocation. ${
      logsInRange.length > 0
        ? `${logsInRange.length} daily log(s) were recorded during this reporting period with no unresolved safety incidents.`
        : "No daily logs were recorded during this specific reporting period."
    }`,
    source: "fallback",
  };
}

function renderFallbackSectionHtml(
  type: string,
  project: Project,
  logsInRange: Project["dailyLogs"],
  params: {
    builderName: string;
    clientName: string | null;
    contractorName: string | null;
    engineerName: string | null;
    dateRangeStart: string;
    dateRangeEnd: string;
  }
): string {
  switch (type) {
    case "project_information":
      return `<table class="report-table"><tbody>
        <tr><th>Project Name</th><td>${project.name}</td><th>Project Code</th><td>${project.projectCode}</td></tr>
        <tr><th>Address</th><td colspan="3">${project.address}, ${project.city}, ${project.state}</td></tr>
        <tr><th>Status</th><td>${project.status.replace("_", " ")}</td><th>Percent Complete</th><td>${project.percentComplete}%</td></tr>
        <tr><th>Start Date</th><td>${project.startDate}</td><th>Est. Completion</th><td>${project.estimatedEndDate}</td></tr>
      </tbody></table>`;
    case "builder_information":
      return `<p><strong>Builder:</strong> ${params.builderName}</p>`;
    case "client_information":
      return `<p><strong>Client:</strong> ${params.clientName ?? "N/A"}</p>`;
    case "contractor_information":
      return `<p><strong>Contractor:</strong> ${params.contractorName ?? "N/A"}</p>`;
    case "engineer_information":
      return `<p><strong>Engineer:</strong> ${params.engineerName ?? "N/A"}</p>`;
    case "daily_progress":
    case "weekly_progress":
      if (logsInRange.length === 0) {
        return `<p>No daily log entries were recorded between ${params.dateRangeStart} and ${params.dateRangeEnd}.</p>`;
      }
      return logsInRange
        .map(
          (log) =>
            `<p><strong>${log.date} (${log.weather}):</strong> ${log.workCompleted} Crew on site: ${log.crewOnSite}, hours worked: ${log.hoursWorked}. ${log.incidents}</p>`
        )
        .join("");
    case "material_usage":
      return `<table class="report-table"><thead><tr><th>Material</th><th>Planned</th><th>Used</th><th>Remaining</th></tr></thead><tbody>${project.materialUsage
        .map(
          (m) =>
            `<tr><td>${m.material}</td><td>${m.planned} ${m.unit}</td><td>${m.used} ${m.unit}</td><td>${m.remaining} ${m.unit}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "equipment":
      return `<table class="report-table"><thead><tr><th>Equipment</th><th>Type</th><th>Qty</th><th>Hours Used</th><th>Status</th></tr></thead><tbody>${project.equipment
        .map(
          (e) =>
            `<tr><td>${e.name}</td><td>${e.type}</td><td>${e.quantity}</td><td>${e.hoursUsed}</td><td>${e.status.replace("_", " ")}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "labour":
      return `<table class="report-table"><thead><tr><th>Role</th><th>Headcount</th><th>Hours Logged</th><th>Shift</th></tr></thead><tbody>${project.labour
        .map(
          (l) =>
            `<tr><td>${l.role}</td><td>${l.headcount}</td><td>${l.hoursLogged}</td><td>${l.shift}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "budget":
      return `<table class="report-table"><thead><tr><th>Category</th><th>Allocated</th><th>Spent</th><th>Remaining</th></tr></thead><tbody>${project.budgetBreakdown
        .map(
          (b) =>
            `<tr><td>${b.category}</td><td>$${b.allocated.toLocaleString()}</td><td>$${b.spent.toLocaleString()}</td><td>$${(b.allocated - b.spent).toLocaleString()}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "timeline":
      return `<table class="report-table"><thead><tr><th>Milestone</th><th>Planned</th><th>Actual</th><th>Status</th></tr></thead><tbody>${project.milestones
        .map(
          (m) =>
            `<tr><td>${m.name}</td><td>${m.plannedDate}</td><td>${m.actualDate ?? "—"}</td><td>${m.status.replace("_", " ")}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "images":
      return `<div>${project.images
        .map((img) => `<p><em>${img.caption}</em> — captured ${img.capturedAt}</p>`)
        .join("")}</div>`;
    case "ai_summary":
      return `<p>${project.name} is ${project.percentComplete}% complete and currently ${project.status.replace(
        "_",
        " "
      )}. Spend to date is $${project.spentBudget.toLocaleString()} of a $${project.totalBudget.toLocaleString()} total budget.</p>`;
    case "recommendations":
      return `<ul><li>Continue monitoring schedule adherence against milestone dates.</li><li>Review material remaining quantities to avoid delivery delays.</li><li>Confirm equipment maintenance schedules for idle units.</li></ul>`;
    case "signature":
      return `<p>Prepared by: _______________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ______________</p><p>Reviewed by: _______________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ______________</p>`;
    case "appendix":
      return `<p>No supplementary documents attached to this report.</p>`;
    default:
      return `<p>No data available for this section.</p>`;
  }
}
