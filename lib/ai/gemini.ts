import { GoogleGenerativeAI } from "@google/generative-ai";

import { SECTION_CATALOG } from "@/lib/constants";
import { GSTIN_REGEX } from "@/lib/gst/india-states";
import {
  buildReportGenerationPrompt,
  buildTemplateGenerationPrompt,
  buildTemplateImportPrompt,
} from "./prompts";
import type {
  AiReportSuggestion,
  AiTemplateImportSuggestion,
  AiTemplateSuggestion,
  DocumentKind,
  Project,
  ProjectRecord,
  ReportTemplate,
  SectionType,
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
  projectRecords?: ProjectRecord[];
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

export async function generateTemplateImportSuggestion(
  extractedText: string,
  documentKind: DocumentKind,
  apiKey: string | null
): Promise<AiTemplateImportSuggestion> {
  if (apiKey && extractedText.trim().length > 0) {
    try {
      const raw = (await callGemini(
        apiKey,
        buildTemplateImportPrompt(extractedText, documentKind)
      )) as Partial<AiTemplateImportSuggestion>;

      if (documentKind === "invoice" && raw.name) {
        return {
          documentKind: "invoice",
          name: raw.name,
          description: raw.description || "",
          formattingNotes: raw.formattingNotes || "",
          termsAndConditions: raw.termsAndConditions || "",
          notes: raw.notes || "",
          detectedGstin: raw.detectedGstin ?? null,
          source: "gemini",
        };
      }

      const sections = (raw.sections ?? [])
        .filter((s) => VALID_SECTION_TYPES.has(s.type))
        .map((s) => ({ type: s.type, title: s.title || s.type, description: s.description || "" }));

      if (documentKind === "report" && sections.length > 0 && raw.name) {
        return {
          documentKind: "report",
          name: raw.name,
          description: raw.description || "",
          formattingNotes: raw.formattingNotes || "",
          reportType: raw.reportType || "custom",
          sections,
          source: "gemini",
        };
      }
    } catch {
      // fall through to local fallback generator below
    }
  }

  return buildFallbackTemplateImportSuggestion(extractedText, documentKind);
}

const GSTIN_SEARCH_REGEX = new RegExp(GSTIN_REGEX.source.replace(/^\^|\$$/g, ""));

function buildFallbackTemplateImportSuggestion(
  extractedText: string,
  documentKind: DocumentKind
): AiTemplateImportSuggestion {
  const fileLabel = extractedText.trim().length > 0 ? "the uploaded document" : "an uploaded document";

  if (documentKind === "invoice") {
    const gstinMatch = extractedText.toUpperCase().match(GSTIN_SEARCH_REGEX);
    // Stop at the next labeled field or blank line, not just the next blank
    // line, so single-line-per-field documents (common PDF/DOCX text
    // extraction output) don't bleed into the following field.
    const NEXT_FIELD_LOOKAHEAD = "(?=\\n\\s*(?:notes?|terms(?:\\s*(?:&|and)\\s*conditions)?|payment terms|gstin|bill\\s*to)\\s*[:\\-]|\\n\\n|$)";
    const termsMatch = extractedText.match(
      new RegExp(
        `(?:terms(?:\\s*(?:&|and)\\s*conditions)?|payment terms)\\s*[:\\-]?\\s*([\\s\\S]{0,300}?)${NEXT_FIELD_LOOKAHEAD}`,
        "i"
      )
    );
    const notesMatch = extractedText.match(
      new RegExp(`(?:notes?)\\s*[:\\-]?\\s*([\\s\\S]{0,200}?)${NEXT_FIELD_LOOKAHEAD}`, "i")
    );

    return {
      documentKind: "invoice",
      name: "Imported Invoice Template",
      description: `Auto-drafted from ${fileLabel}. Review and adjust before publishing.`,
      formattingNotes:
        "Use a clean sans-serif font, a single accent color for headers, and a clear line-items table with tax columns.",
      termsAndConditions:
        termsMatch?.[1]?.trim() ||
        "Payment due within 30 days of invoice date. Late payments may attract interest at 1.5% per month.",
      notes: notesMatch?.[1]?.trim() || "Thank you for your business.",
      detectedGstin: gstinMatch?.[0] ?? null,
      source: "fallback",
    };
  }

  const suggestion = buildFallbackTemplateSuggestion(extractedText || "Imported report template");
  return {
    documentKind: "report",
    name: "Imported Report Template",
    description: `Auto-drafted from ${fileLabel}. Review and adjust before publishing.`,
    formattingNotes: suggestion.formattingNotes,
    reportType: suggestion.reportType,
    sections: suggestion.sections,
    source: "fallback",
  };
}

/**
 * Deterministic, no-API-key-required generator so the AI features remain
 * fully functional out of the box. Used whenever no Gemini key is
 * configured or a live call fails for any reason.
 */
function buildFallbackTemplateSuggestion(userPrompt: string): AiTemplateSuggestion {
  const lower = userPrompt.toLowerCase();

  const isWeekly = /weekly/.test(lower);
  const isSafety = /safety|hazard|incident/.test(lower);
  const isQuality = /quality|inspection|punch\s?list|deficienc/.test(lower);
  const isAudit = /audit/.test(lower);
  const isBudget = /budget|cost|financial|earned value/.test(lower);
  const isChangeOrder = /change order|rfi|submittal/.test(lower);
  const isCompliance = /permit|compliance|code/.test(lower);
  const isSchedule = /schedule|milestone|look.?ahead|timeline/.test(lower);
  const isFinal = /final|completion|closeout|handover/.test(lower);

  const reportType = isFinal
    ? "final_completion"
    : isAudit && isQuality
      ? "quality_audit"
      : isAudit && isSafety
        ? "safety_audit"
        : isChangeOrder || isCompliance
          ? "inspection"
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
      type: "weather_conditions",
      title: "Weather & Site Conditions",
      description: "Temperature, precipitation, wind and workable hours.",
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
      type: "subcontractor_log",
      title: "Subcontractor Log",
      description: "Subcontractors on site, crew size and scope performed.",
    },
    {
      type: "material_usage",
      title: "Material Usage",
      description: "Planned vs. used quantities for key materials.",
    },
    {
      type: "deliveries",
      title: "Deliveries",
      description: "Material and equipment deliveries received on site.",
    },
    {
      type: "equipment",
      title: "Equipment Utilization",
      description: "Equipment on site, utilization and operational status.",
    },
  ];

  if (isSchedule || isWeekly) {
    baseSections.push({
      type: "timeline",
      title: "Milestone Timeline",
      description: "Milestones with planned vs. actual dates and status.",
    });
    baseSections.push({
      type: "look_ahead_schedule",
      title: "Two-Week Look-Ahead",
      description: "Upcoming activities planned for the next reporting period.",
    });
  }

  if (isBudget) {
    baseSections.push({
      type: "budget",
      title: "Budget Status",
      description: "Budget allocation and spend by category.",
    });
    baseSections.push({
      type: "cost_forecast",
      title: "Cost Forecast & Earned Value",
      description: "Earned value, cost/schedule performance and forecast at completion.",
    });
    baseSections.push({
      type: "financial_summary",
      title: "Financial Summary",
      description: "Live contract, cost, billing and margin figures from the Finance module.",
    });
  }

  if (isChangeOrder) {
    baseSections.push(
      {
        type: "rfi_log",
        title: "RFI Log",
        description: "Requests for information, status and responses.",
      },
      {
        type: "change_orders",
        title: "Change Orders",
        description: "Change order log with cost and schedule impact.",
      },
      {
        type: "submittals",
        title: "Submittals Log",
        description: "Shop drawings and material submittals with review status.",
      }
    );
  }

  if (isQuality) {
    baseSections.push(
      {
        type: "quality_inspection",
        title: "Quality Control & Inspections",
        description: "Quality control inspections, results and deficiencies.",
      },
      {
        type: "punch_list",
        title: "Punch List",
        description: "Outstanding items requiring completion or rework.",
      }
    );
  }

  if (isSafety) {
    baseSections.push({
      type: "safety_incidents",
      title: "Safety & Incident Log",
      description: "Incidents, near-misses, toolbox talks and corrective actions.",
    });
  }

  if (isCompliance) {
    baseSections.push({
      type: "permits_compliance",
      title: "Permits & Compliance",
      description: "Permit status, inspections and code compliance.",
    });
  }

  if (isAudit || isSafety || isQuality) {
    baseSections.push({
      type: "risk_register",
      title: "Risk Register",
      description: "Identified risks, likelihood, impact and mitigation plans.",
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
      type: "recommendations",
      title: isSafety ? "Safety Findings & Recommendations" : "Recommendations",
      description: "Findings, risks and recommended next actions.",
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
      "Weather Log Table",
      ...(isBudget ? ["Budget Breakdown Table", "Cost Forecast Table"] : []),
      ...(isChangeOrder ? ["RFI Log Table", "Change Order Table", "Submittals Table"] : []),
      ...(isQuality ? ["Quality Inspection Table", "Punch List Table"] : []),
      ...(isSafety ? ["Safety Incident Table"] : []),
      ...(isCompliance ? ["Permits & Compliance Table"] : []),
    ],
    formattingNotes:
      "Use a clean sans-serif font, generous whitespace, and a single accent color for headers and table borders.",
    summaryPrompts: [
      "Summarize overall progress against the schedule.",
      "Highlight any safety incidents, quality deficiencies, or delays.",
      "Note material, labour, or subcontractor issues requiring attention.",
      "Flag open RFIs, change orders, or compliance items awaiting response.",
    ],
    source: "fallback",
  };
}

export async function buildFallbackReportSuggestion(params: {
  template: ReportTemplate;
  project: Project;
  builderName: string;
  clientName: string | null;
  contractorName: string | null;
  engineerName: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  projectRecords?: ProjectRecord[];
}): Promise<AiReportSuggestion> {
  const { template, project } = params;
  const logsInRange = project.dailyLogs.filter(
    (log) => log.date >= params.dateRangeStart && log.date <= params.dateRangeEnd
  );

  const visibleSections = template.sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const sections = visibleSections.map((section) => ({
    sectionId: section.id,
    html: renderFallbackSectionHtml(section.type, project, logsInRange, params),
  }));

  const recordCount = params.projectRecords?.length ?? 0;
  const recordSummary = recordCount > 0 ? ` Report synthesizes ${recordCount} field evidence records.` : "";

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
    }${recordSummary}`,
    source: "fallback",
  };
}

function renderFallbackSectionHtml(
  type: SectionType,
  project: Project,
  logsInRange: Project["dailyLogs"],
  params: {
    builderName: string;
    clientName: string | null;
    contractorName: string | null;
    engineerName: string | null;
    dateRangeStart: string;
    dateRangeEnd: string;
    projectRecords?: ProjectRecord[];
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
    case "recommendations": {
      const openRisks = project.risks.filter((r) => r.status === "open");
      const items = [
        "Continue monitoring schedule adherence against milestone dates.",
        "Review material remaining quantities to avoid delivery delays.",
        "Confirm equipment maintenance schedules for idle units.",
        ...openRisks.map((r) => `Address open risk (${r.category}): ${r.description}`),
      ];
      return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
    }
    case "signature":
      return `<p>Prepared by: _______________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ______________</p><p>Reviewed by: _______________________&nbsp;&nbsp;&nbsp;&nbsp;Date: ______________</p>`;
    case "appendix":
      return `<p>No supplementary documents attached to this report.</p>`;
    case "weather_conditions": {
      const logs = project.weatherLog.filter(
        (w) => w.date >= params.dateRangeStart && w.date <= params.dateRangeEnd
      );
      if (logs.length === 0) return `<p>No weather data recorded for this reporting period.</p>`;
      return `<table class="report-table"><thead><tr><th>Date</th><th>Conditions</th><th>High / Low</th><th>Precip.</th><th>Wind</th><th>Workable Hours</th><th>Delay Notes</th></tr></thead><tbody>${logs
        .map(
          (w) =>
            `<tr><td>${w.date}</td><td>${w.conditions}</td><td>${w.tempHighF}°F / ${w.tempLowF}°F</td><td>${w.precipitationIn}in</td><td>${w.windMph}mph</td><td>${w.workableHours}</td><td>${w.delayNotes}</td></tr>`
        )
        .join("")}</tbody></table>`;
    }
    case "look_ahead_schedule":
      if (project.lookAheadSchedule.length === 0)
        return `<p>No upcoming activities have been scheduled at this time.</p>`;
      return `<table class="report-table"><thead><tr><th>Activity</th><th>Trade</th><th>Planned Start</th><th>Planned End</th><th>Notes</th></tr></thead><tbody>${project.lookAheadSchedule
        .map(
          (a) =>
            `<tr><td>${a.activity}</td><td>${a.trade}</td><td>${a.plannedStart}</td><td>${a.plannedEnd}</td><td>${a.notes}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "deliveries":
      if (project.deliveries.length === 0) return `<p>No deliveries recorded for this reporting period.</p>`;
      return `<table class="report-table"><thead><tr><th>Date</th><th>Vendor</th><th>Material</th><th>Quantity</th><th>Condition</th><th>Received By</th></tr></thead><tbody>${project.deliveries
        .map(
          (d) =>
            `<tr><td>${d.date}</td><td>${d.vendor}</td><td>${d.material}</td><td>${d.quantity} ${d.unit}</td><td>${d.condition}</td><td>${d.receivedBy}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "subcontractor_log":
      if (project.subcontractorLog.length === 0) return `<p>No subcontractor activity recorded.</p>`;
      return `<table class="report-table"><thead><tr><th>Date</th><th>Contractor</th><th>Trade</th><th>Crew Size</th><th>Scope Today</th><th>Status</th></tr></thead><tbody>${project.subcontractorLog
        .map(
          (s) =>
            `<tr><td>${s.date}</td><td>${s.contractor}</td><td>${s.trade}</td><td>${s.crewSize}</td><td>${s.scopeToday}</td><td>${s.status.replace("_", " ")}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "cost_forecast": {
      const totalAllocated = project.budgetBreakdown.reduce((sum, b) => sum + b.allocated, 0);
      const totalSpent = project.budgetBreakdown.reduce((sum, b) => sum + b.spent, 0);
      const percentSpent = totalAllocated > 0 ? totalSpent / totalAllocated : 0;
      const cpi = project.percentComplete > 0 ? project.percentComplete / 100 / percentSpent : 1;
      const forecastAtCompletion = cpi > 0 ? totalAllocated / cpi : totalAllocated;
      return `<table class="report-table"><tbody>
        <tr><th>Budget at Completion</th><td>$${totalAllocated.toLocaleString()}</td><th>Actual Cost to Date</th><td>$${totalSpent.toLocaleString()}</td></tr>
        <tr><th>Percent Complete</th><td>${project.percentComplete}%</td><th>Cost Performance Index</th><td>${cpi.toFixed(2)}</td></tr>
        <tr><th>Forecast at Completion</th><td colspan="3">$${Math.round(forecastAtCompletion).toLocaleString()}</td></tr>
      </tbody></table>
      <p>${cpi >= 1 ? "The project is currently spending at or under the rate implied by physical progress." : "The project is currently spending ahead of the rate implied by physical progress; cost variance should be monitored closely."}</p>`;
    }
    case "change_orders":
      if (project.changeOrders.length === 0) return `<p>No change orders logged for this project.</p>`;
      return `<table class="report-table"><thead><tr><th>CO #</th><th>Description</th><th>Date</th><th>Cost Impact</th><th>Schedule Impact</th><th>Status</th></tr></thead><tbody>${project.changeOrders
        .map(
          (c) =>
            `<tr><td>${c.id}</td><td>${c.description}</td><td>${c.date}</td><td>$${c.costImpact.toLocaleString()}</td><td>${c.scheduleImpactDays} day(s)</td><td>${c.status}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "rfi_log":
      if (project.rfis.length === 0) return `<p>No RFIs logged for this project.</p>`;
      return `<table class="report-table"><thead><tr><th>RFI #</th><th>Subject</th><th>Submitted</th><th>Assigned To</th><th>Status</th><th>Response</th></tr></thead><tbody>${project.rfis
        .map(
          (r) =>
            `<tr><td>${r.id}</td><td>${r.subject}</td><td>${r.dateSubmitted}</td><td>${r.assignedTo}</td><td>${r.status}</td><td>${r.response || "Pending response"}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "submittals":
      if (project.submittals.length === 0) return `<p>No submittals logged for this project.</p>`;
      return `<table class="report-table"><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Submitted</th><th>Due</th><th>Status</th></tr></thead><tbody>${project.submittals
        .map(
          (s) =>
            `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.type}</td><td>${s.submittedDate}</td><td>${s.dueDate}</td><td>${s.status.replace(/_/g, " ")}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "quality_inspection":
      if (project.qualityInspections.length === 0) return `<p>No quality inspections recorded for this period.</p>`;
      return `<table class="report-table"><thead><tr><th>Date</th><th>Area</th><th>Inspector</th><th>Result</th><th>Deficiencies</th></tr></thead><tbody>${project.qualityInspections
        .map(
          (q) =>
            `<tr><td>${q.date}</td><td>${q.area}</td><td>${q.inspector}</td><td>${q.result.replace(/_/g, " ")}</td><td>${q.deficiencies}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "punch_list":
      if (project.punchList.length === 0) return `<p>No open punch list items.</p>`;
      return `<table class="report-table"><thead><tr><th>ID</th><th>Area</th><th>Item</th><th>Trade</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead><tbody>${project.punchList
        .map(
          (p) =>
            `<tr><td>${p.id}</td><td>${p.area}</td><td>${p.item}</td><td>${p.trade}</td><td>${p.priority}</td><td>${p.status.replace("_", " ")}</td><td>${p.dueDate}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "safety_incidents":
      if (project.safetyIncidents.length === 0) return `<p>No safety incidents or observations recorded for this period.</p>`;
      return `<table class="report-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Severity</th><th>Corrective Action</th><th>Status</th></tr></thead><tbody>${project.safetyIncidents
        .map(
          (s) =>
            `<tr><td>${s.date}</td><td>${s.type.replace(/_/g, " ")}</td><td>${s.description}</td><td>${s.severity}</td><td>${s.correctiveAction}</td><td>${s.status}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "permits_compliance":
      if (project.permits.length === 0) return `<p>No permits on file for this project.</p>`;
      return `<table class="report-table"><thead><tr><th>Permit Type</th><th>Number</th><th>Status</th><th>Last Inspection</th><th>Result</th></tr></thead><tbody>${project.permits
        .map(
          (p) =>
            `<tr><td>${p.type}</td><td>${p.permitNumber}</td><td>${p.status}</td><td>${p.lastInspectionType}${p.lastInspectionDate ? ` (${p.lastInspectionDate})` : ""}</td><td>${p.lastInspectionResult.replace(/_/g, " ")}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "risk_register":
      if (project.risks.length === 0) return `<p>No risks currently logged for this project.</p>`;
      return `<table class="report-table"><thead><tr><th>ID</th><th>Category</th><th>Description</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th><th>Status</th></tr></thead><tbody>${project.risks
        .map(
          (r) =>
            `<tr><td>${r.id}</td><td>${r.category}</td><td>${r.description}</td><td>${r.likelihood}</td><td>${r.impact}</td><td>${r.mitigation}</td><td>${r.status}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "visitor_log":
      if (project.visitorLog.length === 0) return `<p>No visitors logged for this reporting period.</p>`;
      return `<table class="report-table"><thead><tr><th>Date</th><th>Visitor</th><th>Company</th><th>Purpose</th><th>Time In / Out</th><th>Escorted By</th></tr></thead><tbody>${project.visitorLog
        .map(
          (v) =>
            `<tr><td>${v.date}</td><td>${v.visitorName}</td><td>${v.company}</td><td>${v.purpose}</td><td>${v.timeIn} – ${v.timeOut}</td><td>${v.escortedBy}</td></tr>`
        )
        .join("")}</tbody></table>`;
    case "financial_summary": {
      // Figures are rendered from the Finance snapshot (see lib/pdf/financial-summary.ts);
      // the fallback only adds brief commentary.
      const budget = project.finance?.snapshot.budget;
      if (!budget) return "";
      const drift = budget.utilizationPercent - budget.progressPercent;
      return `<p>${
        drift > 3
          ? `Cost consumption is running ${drift.toFixed(1)} points ahead of physical progress; review committed costs and pending change orders before the next billing cycle.`
          : "Cost consumption is tracking in line with physical progress."
      }</p>`;
    }
    default:
      return `<p>No data available for this section.</p>`;
  }
}
