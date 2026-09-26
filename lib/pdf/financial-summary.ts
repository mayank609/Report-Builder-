import type { FinanceProjectSnapshot } from "@/integration/contract";
import type { Project } from "@/types";
import { buildComparisonBarChartSvg } from "./charts";

/**
 * Deterministic "Financial Summary" section built from the Finance module's
 * published snapshot. Money figures are never delegated to the AI model — the
 * model's text (if any) is appended below as commentary only.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString()}`;
  }
}

export function formatMoneyCompact(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatMoney(value, currency);
  }
}

const HEALTH_LABEL: Record<FinanceProjectSnapshot["budget"]["health"], string> = {
  healthy: "Healthy",
  at_risk: "At risk",
  over_budget: "Over budget",
  critical: "Critical",
};

const HEALTH_COLOR: Record<FinanceProjectSnapshot["budget"]["health"], string> = {
  healthy: "#0ca30c",
  at_risk: "#c98500",
  over_budget: "#d03b3b",
  critical: "#d03b3b",
};

function row(label: string, value: string): string {
  return `<tr><th>${escapeHtml(label)}</th><td>${value}</td></tr>`;
}

export function buildFinancialSummaryHtml(snapshot: FinanceProjectSnapshot, syncedAt: string): string {
  const c = snapshot.currency;
  const m = (n: number) => escapeHtml(formatMoney(n, c));
  const { budget, contract, billing, profitability } = snapshot;

  const chart = snapshot.categories.length
    ? `<div class="report-chart">${buildComparisonBarChartSvg({
        title: "Cost by Category: Budget vs. Actual",
        seriesALabel: "Budget",
        seriesBLabel: "Actual",
        rows: snapshot.categories.map((line) => ({
          label: line.category.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
          a: line.allocated,
          b: line.actual,
        })),
        formatValue: (n) => formatMoneyCompact(n, c),
      })}</div>`
    : "";

  const pendingCOs = snapshot.changeOrders.filter((co) => co.status === "pending");
  const pendingCOValue = pendingCOs.reduce((sum, co) => sum + co.costImpact, 0);

  const syncedLabel = new Date(syncedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `${chart}
<p><strong>Budget health:</strong> <span style="color:${HEALTH_COLOR[budget.health]};font-weight:600">${
    HEALTH_LABEL[budget.health]
  }</span> — ${budget.utilizationPercent.toFixed(1)}% of the revised budget consumed at ${budget.progressPercent.toFixed(
    0
  )}% physical progress.</p>
<table class="report-table"><tbody>
${row("Original contract value", m(contract.originalValue))}
${row("Approved change orders", m(contract.approvedChangeOrders))}
${row("Revised contract value", m(contract.revisedValue))}
</tbody></table>
<table class="report-table"><tbody>
${row("Revised budget", m(budget.revised))}
${row("Committed cost", m(budget.committed))}
${row("Actual cost to date", m(budget.actual))}
${row("Remaining budget", m(budget.remaining))}
${row("Forecast at completion", m(budget.forecastAtCompletion))}
${row("Variance (budget − forecast)", m(budget.revised - budget.forecastAtCompletion))}
</tbody></table>
<table class="report-table"><tbody>
${row("Invoiced to date", m(billing.invoiced))}
${row("Collected", m(billing.collected))}
${row("Outstanding receivables", `${m(billing.outstanding)}${billing.overdueInvoices ? ` (${billing.overdueInvoices} overdue)` : ""}`)}
${row("Retention held", m(billing.retentionHeld))}
${row("Gross margin to date", `${profitability.grossMarginPercent.toFixed(1)}%`)}
${row("Forecast margin", `${profitability.forecastMarginPercent.toFixed(1)}%`)}
</tbody></table>
${
  pendingCOs.length
    ? `<p><strong>${pendingCOs.length} change order${pendingCOs.length === 1 ? "" : "s"} pending approval</strong> totalling ${m(
        pendingCOValue
      )}.</p>`
    : ""
}
<p style="font-size:11px;color:#6b7280">Source: Finance module (${escapeHtml(
    snapshot.source.projectCode || snapshot.source.projectName
  )}), synced ${escapeHtml(syncedLabel)}. Figures in ${escapeHtml(c)}.</p>`;
}

/** Section HTML for `financial_summary`: live numbers + optional AI commentary. */
export function renderFinancialSummarySection(project: Project, commentaryHtml: string): string {
  const commentary = commentaryHtml.trim()
    ? `<h4 style="margin-top:12px">Commentary</h4>${commentaryHtml}`
    : "";
  if (!project.finance) {
    return `<p><em>This project is not yet linked to the Finance module, so live financials are unavailable. Link it from Finance → Projects &amp; Budget → “Sync to Report Builder”.</em></p>${commentary}`;
  }
  return `${buildFinancialSummaryHtml(project.finance.snapshot, project.finance.syncedAt)}${commentary}`;
}
