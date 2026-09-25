import type { Project, SectionType } from "@/types";
import { formatMoneyCompact, renderFinancialSummarySection } from "./financial-summary";

/**
 * Print-safe inline SVG chart builders. Pure markup (no JS/canvas), so they
 * render identically in the live iframe preview and in the Puppeteer PDF
 * export. Palette and mark specs follow the dataviz skill: fixed categorical
 * slots (blue = planned/allocated, aqua = actual/spent/used), reserved
 * status colors for threshold indicators, thin marks, direct labels (the
 * only way to convey precise values in a non-interactive/print context),
 * hairline gridlines, text in ink tokens rather than series colors.
 */

const COLOR_PLANNED = "#2a78d6"; // categorical slot 1 (blue)
const COLOR_ACTUAL = "#1baf7a"; // categorical slot 2 (aqua)
const COLOR_GOOD = "#0ca30c";
const COLOR_WARNING = "#c98500"; // darker step for 3:1 text/label contrast on white
const COLOR_CRITICAL = "#d03b3b";
const COLOR_INK = "#111827";
const COLOR_INK_MUTED = "#6b7280";
const COLOR_GRID = "#e5e7eb";
const COLOR_BASELINE = "#c3c2b7";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatNumberCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(value).toLocaleString()}`;
}

function svgWrap(inner: string, width: number, height: number): string {
  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; display: block;">${inner}</svg>`;
}

interface ComparisonRow {
  label: string;
  a: number;
  b: number;
}

/**
 * Horizontal grouped bar chart, two series (planned/allocated vs
 * actual/spent). Horizontal orientation avoids label rotation/collision for
 * longer category names and reads well at report-column width.
 */
export function buildComparisonBarChartSvg(params: {
  title: string;
  seriesALabel: string;
  seriesBLabel: string;
  rows: ComparisonRow[];
  formatValue?: (n: number) => string;
}): string {
  const { title, seriesALabel, seriesBLabel, rows, formatValue = formatCurrencyCompact } = params;
  const width = 720;
  const rowHeight = 46;
  const chartTop = 46;
  const chartLeft = 190;
  const chartRight = width - 90;
  const chartWidth = chartRight - chartLeft;
  // Cap the longest bar at 70% of the available width so there's always
  // guaranteed room for its value label after it.
  const usableWidth = chartWidth * 0.7;
  const height = chartTop + rows.length * rowHeight + 24;
  const maxValue = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));

  const barThickness = 16;
  const gap = 3;

  const bars = rows
    .map((row, i) => {
      const rowY = chartTop + i * rowHeight;
      const aWidth = (row.a / maxValue) * usableWidth;
      const bWidth = (row.b / maxValue) * usableWidth;
      const aY = rowY;
      const bY = rowY + barThickness + gap;
      return `
        <text x="${chartLeft - 12}" y="${rowY + barThickness + gap / 2 + 5}" text-anchor="end" font-size="12" fill="${COLOR_INK}">${escapeXml(row.label)}</text>
        <rect x="${chartLeft}" y="${aY}" width="${Math.max(aWidth, 1)}" height="${barThickness}" rx="4" fill="${COLOR_PLANNED}" />
        <text x="${chartLeft + aWidth + 6}" y="${aY + barThickness - 4}" font-size="10.5" fill="${COLOR_INK_MUTED}">${escapeXml(formatValue(row.a))}</text>
        <rect x="${chartLeft}" y="${bY}" width="${Math.max(bWidth, 1)}" height="${barThickness}" rx="4" fill="${COLOR_ACTUAL}" />
        <text x="${chartLeft + bWidth + 6}" y="${bY + barThickness - 4}" font-size="10.5" fill="${COLOR_INK_MUTED}">${escapeXml(formatValue(row.b))}</text>
      `;
    })
    .join("");

  return svgWrap(
    `
    <text x="0" y="20" font-size="13" font-weight="600" fill="${COLOR_INK}">${escapeXml(title)}</text>
    <g>
      <rect x="${width - 210}" y="6" width="10" height="10" rx="2" fill="${COLOR_PLANNED}" />
      <text x="${width - 195}" y="15" font-size="11" fill="${COLOR_INK_MUTED}">${escapeXml(seriesALabel)}</text>
      <rect x="${width - 100}" y="6" width="10" height="10" rx="2" fill="${COLOR_ACTUAL}" />
      <text x="${width - 85}" y="15" font-size="11" fill="${COLOR_INK_MUTED}">${escapeXml(seriesBLabel)}</text>
    </g>
    <line x1="${chartLeft}" y1="${chartTop - 8}" x2="${chartLeft}" y2="${chartTop + rows.length * rowHeight - 12}" stroke="${COLOR_BASELINE}" stroke-width="1" />
    ${bars}
  `,
    width,
    height
  );
}

interface SingleSeriesRow {
  label: string;
  value: number;
  detail?: string;
}

/**
 * Single-series horizontal bar chart (one categorical hue — slot 1 blue).
 * Used where there's no meaningful "planned vs actual" pair to compare.
 */
export function buildSingleSeriesBarChartSvg(params: {
  title: string;
  rows: SingleSeriesRow[];
  formatValue?: (n: number) => string;
}): string {
  const { title, rows, formatValue = formatNumberCompact } = params;
  const width = 720;
  const rowHeight = 34;
  const chartTop = 34;
  const chartLeft = 190;
  const chartRight = width - 90;
  const chartWidth = chartRight - chartLeft;
  // Cap the longest bar at 70% of the available width so there's always
  // guaranteed room for its label after it, regardless of label length.
  const usableWidth = chartWidth * 0.7;
  const height = chartTop + rows.length * rowHeight + 16;
  const maxValue = Math.max(1, ...rows.map((r) => r.value));
  const barThickness = 18;

  const bars = rows
    .map((row, i) => {
      const rowY = chartTop + i * rowHeight;
      const barWidth = Math.max((row.value / maxValue) * usableWidth, 2);
      return `
        <text x="${chartLeft - 12}" y="${rowY + barThickness - 4}" text-anchor="end" font-size="12" fill="${COLOR_INK}">${escapeXml(row.label)}</text>
        <rect x="${chartLeft}" y="${rowY}" width="${barWidth}" height="${barThickness}" rx="4" fill="${COLOR_PLANNED}" />
        <text x="${chartLeft + barWidth + 6}" y="${rowY + barThickness - 4}" font-size="10.5" fill="${COLOR_INK_MUTED}">${escapeXml(formatValue(row.value))}${row.detail ? ` ${escapeXml(row.detail)}` : ""}</text>
      `;
    })
    .join("");

  return svgWrap(
    `
    <text x="0" y="18" font-size="13" font-weight="600" fill="${COLOR_INK}">${escapeXml(title)}</text>
    <line x1="${chartLeft}" y1="${chartTop - 6}" x2="${chartLeft}" y2="${chartTop + rows.length * rowHeight - 8}" stroke="${COLOR_BASELINE}" stroke-width="1" />
    ${bars}
  `,
    width,
    height
  );
}

interface StatusRow {
  label: string;
  percent: number;
  detail: string;
}

/**
 * Single-series horizontal bar using the reserved status palette as a
 * threshold indicator (good / warning / critical), with the percentage
 * always shown as a direct label so status is never color-alone.
 */
export function buildStatusBarChartSvg(params: { title: string; rows: StatusRow[] }): string {
  const { title, rows } = params;
  const width = 720;
  const rowHeight = 40;
  const chartTop = 40;
  const chartLeft = 210;
  const chartRight = width - 70;
  const chartWidth = chartRight - chartLeft;
  const height = chartTop + rows.length * rowHeight + 16;
  const scaleMax = 150; // cap visual scale at 150% of plan; values beyond still labeled accurately

  const markerX = chartLeft + Math.min(1, 100 / scaleMax) * chartWidth;

  const bars = rows
    .map((row, i) => {
      const rowY = chartTop + i * rowHeight;
      const color = row.percent > 100 ? COLOR_CRITICAL : row.percent >= 80 ? COLOR_WARNING : COLOR_GOOD;
      const barWidth = Math.max((Math.min(row.percent, scaleMax) / scaleMax) * chartWidth, 2);
      return `
        <text x="${chartLeft - 12}" y="${rowY + 15}" text-anchor="end" font-size="12" fill="${COLOR_INK}">${escapeXml(row.label)}</text>
        <rect x="${chartLeft}" y="${rowY}" width="${chartWidth}" height="20" rx="4" fill="${COLOR_GRID}" />
        <rect x="${chartLeft}" y="${rowY}" width="${barWidth}" height="20" rx="4" fill="${color}" />
        <text x="${chartLeft + chartWidth + 8}" y="${rowY + 15}" font-size="11.5" font-weight="600" fill="${COLOR_INK}">${Math.round(row.percent)}%</text>
        <text x="${chartLeft}" y="${rowY + 33}" font-size="10" fill="${COLOR_INK_MUTED}">${escapeXml(row.detail)}</text>
      `;
    })
    .join("");

  return svgWrap(
    `
    <text x="0" y="18" font-size="13" font-weight="600" fill="${COLOR_INK}">${escapeXml(title)}</text>
    <line x1="${markerX}" y1="${chartTop - 4}" x2="${markerX}" y2="${chartTop + rows.length * rowHeight - 12}" stroke="${COLOR_INK_MUTED}" stroke-width="1" stroke-dasharray="2,2" />
    <text x="${markerX}" y="${chartTop - 8}" text-anchor="middle" font-size="9" fill="${COLOR_INK_MUTED}">100% of plan</text>
    ${bars}
  `,
    width,
    height
  );
}

interface SCurvePoint {
  label: string;
  planned: number;
  actual: number | null;
}

/**
 * Cost/schedule S-curve: cumulative percent complete over time, planned
 * (blue) vs actual-to-date (aqua). Two categorical series, consistent with
 * the same slot meaning used across every chart in the report (blue =
 * planned/allocated, aqua = actual/spent/used).
 */
export function buildSCurveChartSvg(params: { title: string; points: SCurvePoint[] }): string {
  const { title, points } = params;
  const width = 720;
  const height = 300;
  const chartTop = 40;
  const chartBottom = height - 36;
  const chartLeft = 50;
  const chartRight = width - 24;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const n = points.length;
  const xStep = n > 1 ? chartWidth / (n - 1) : 0;

  const xAt = (i: number) => chartLeft + i * xStep;
  const yAt = (pct: number) => chartBottom - (Math.max(0, Math.min(100, pct)) / 100) * chartHeight;

  const gridLines = [0, 25, 50, 75, 100]
    .map(
      (pct) =>
        `<line x1="${chartLeft}" y1="${yAt(pct)}" x2="${chartRight}" y2="${yAt(pct)}" stroke="${COLOR_GRID}" stroke-width="1" />
         <text x="${chartLeft - 8}" y="${yAt(pct) + 3}" text-anchor="end" font-size="10" fill="${COLOR_INK_MUTED}">${pct}%</text>`
    )
    .join("");

  const plannedPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.planned)}`).join(" ");
  const actualPoints = points.filter((p) => p.actual !== null);
  const actualPath = actualPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(points.indexOf(p))} ${yAt(p.actual as number)}`)
    .join(" ");

  const xLabels = points
    .map(
      (p, i) =>
        `<text x="${xAt(i)}" y="${chartBottom + 16}" text-anchor="middle" font-size="9.5" fill="${COLOR_INK_MUTED}">${escapeXml(p.label)}</text>`
    )
    .join("");

  const lastActual = actualPoints.at(-1);
  const lastActualIdx = lastActual ? points.indexOf(lastActual) : -1;
  const lastPlanned = points.at(-1);

  return svgWrap(
    `
    <text x="0" y="18" font-size="13" font-weight="600" fill="${COLOR_INK}">${escapeXml(title)}</text>
    <g>
      <rect x="${width - 210}" y="6" width="10" height="10" rx="2" fill="${COLOR_PLANNED}" />
      <text x="${width - 195}" y="15" font-size="11" fill="${COLOR_INK_MUTED}">Planned</text>
      <rect x="${width - 130}" y="6" width="10" height="10" rx="2" fill="${COLOR_ACTUAL}" />
      <text x="${width - 115}" y="15" font-size="11" fill="${COLOR_INK_MUTED}">Actual</text>
    </g>
    <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="${COLOR_BASELINE}" stroke-width="1" />
    ${gridLines}
    <path d="${plannedPath}" fill="none" stroke="${COLOR_PLANNED}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    ${actualPath ? `<path d="${actualPath}" fill="none" stroke="${COLOR_ACTUAL}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />` : ""}
    ${lastPlanned ? `<circle cx="${xAt(n - 1)}" cy="${yAt(lastPlanned.planned)}" r="4" fill="${COLOR_PLANNED}" stroke="#ffffff" stroke-width="2" />` : ""}
    ${
      lastActual && lastActualIdx >= 0
        ? `<circle cx="${xAt(lastActualIdx)}" cy="${yAt(lastActual.actual as number)}" r="4" fill="${COLOR_ACTUAL}" stroke="#ffffff" stroke-width="2" />
           <text x="${xAt(lastActualIdx) + 8}" y="${yAt(lastActual.actual as number) - 8}" font-size="11" font-weight="600" fill="${COLOR_INK}">${Math.round(lastActual.actual as number)}%</text>`
        : ""
    }
    ${xLabels}
  `,
    width,
    height
  );
}

// ---------------------------------------------------------------------------
// Project-data-aware wrappers used by real generated reports
// ---------------------------------------------------------------------------

export function buildBudgetChartSvg(project: Project): string {
  return buildComparisonBarChartSvg({
    title: "Budget: Allocated vs. Spent by Category",
    seriesALabel: "Allocated",
    seriesBLabel: "Spent",
    rows: project.budgetBreakdown.map((b) => ({ label: b.category, a: b.allocated, b: b.spent })),
    formatValue: project.finance
      ? (n) => formatMoneyCompact(n, project.finance!.snapshot.currency)
      : formatCurrencyCompact,
  });
}

export function buildLabourChartSvg(project: Project): string {
  return buildSingleSeriesBarChartSvg({
    title: "Labour Hours Logged by Role",
    rows: project.labour.map((l) => ({
      label: l.role,
      value: l.hoursLogged,
      detail: "hrs",
    })),
    formatValue: (n) => n.toLocaleString(),
  });
}

export function buildMaterialUsageChartSvg(project: Project): string {
  return buildStatusBarChartSvg({
    title: "Material Usage — Percent of Planned Quantity Consumed",
    rows: project.materialUsage.map((m) => ({
      label: m.material,
      percent: m.planned > 0 ? (m.used / m.planned) * 100 : 0,
      detail: `${m.used.toLocaleString()} of ${m.planned.toLocaleString()} ${m.unit}`,
    })),
  });
}

function idealSCurvePercent(fraction: number): number {
  // Slow start, steep middle, slow finish — the classic construction spend curve.
  const clamped = Math.max(0, Math.min(1, fraction));
  return 100 * (clamped - Math.sin(2 * Math.PI * clamped) / (2 * Math.PI));
}

export function buildCostForecastChartSvg(project: Project): string {
  const start = new Date(project.startDate).getTime();
  const end = new Date(project.estimatedEndDate).getTime();
  const totalSpan = Math.max(end - start, 1);
  const nowFraction = Math.max(0, Math.min(1, (Date.now() - start) / totalSpan));

  const stepCount = 6;
  const fractions = new Set<number>([0, 1, nowFraction, ...Array.from({ length: stepCount + 1 }, (_, i) => i / stepCount)]);

  const points: SCurvePoint[] = Array.from(fractions)
    .sort((a, b) => a - b)
    .map((fraction) => {
      const date = new Date(start + fraction * totalSpan);
      // Actual-to-date is approximated as a straight ramp from project start
      // to today's real percentComplete — the one number we know for certain.
      const actual =
        fraction > nowFraction
          ? null
          : nowFraction > 0
            ? (fraction / nowFraction) * project.percentComplete
            : project.percentComplete;
      return {
        label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        planned: idealSCurvePercent(fraction),
        actual,
      };
    });

  return buildSCurveChartSvg({ title: "Cost & Schedule Performance (S-Curve)", points });
}

const CHART_ELIGIBLE_TYPES: Partial<Record<SectionType, (project: Project) => string>> = {
  budget: buildBudgetChartSvg,
  cost_forecast: buildCostForecastChartSvg,
  labour: buildLabourChartSvg,
  material_usage: buildMaterialUsageChartSvg,
};

/** Returns a chart SVG for section types that support one, else null. */
export function getChartSvgForSection(type: SectionType, project: Project): string | null {
  const builder = CHART_ELIGIBLE_TYPES[type];
  return builder ? builder(project) : null;
}

/** Prepends a chart above a section's existing HTML content, if eligible. */
export function withChart(type: SectionType, html: string, project: Project): string {
  // Financial figures come verbatim from the Finance module, never from the model.
  if (type === "financial_summary") return renderFinancialSummarySection(project, html);
  const svg = getChartSvgForSection(type, project);
  if (!svg) return html;
  return `<div class="report-chart">${svg}</div>${html}`;
}
