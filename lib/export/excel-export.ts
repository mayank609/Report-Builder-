import type * as XLSXType from "xlsx";

import { htmlToBlocks } from "./html-to-blocks";
import { formatDate } from "@/lib/utils";
import type { GeneratedReport } from "@/types";

const INVALID_SHEET_CHARS = /[\\/?*[\]:]/g;

function sanitizeSheetName(name: string, taken: Set<string>): string {
  const base = name.replace(INVALID_SHEET_CHARS, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let i = 2;
  while (taken.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** xlsx (SheetJS) is a large library; loaded on demand so it never bloats the initial page bundle. */
export async function buildReportWorkbook(report: GeneratedReport): Promise<XLSXType.WorkBook> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const takenNames = new Set<string>();

  const coverRows: (string | number)[][] = [
    ["Report Name", report.name],
    ["Template", report.templateName],
    ["Project", report.projectName],
    ["Report Type", report.reportType.replace(/_/g, " ")],
    ["Status", report.status],
    ["Report Period", `${formatDate(report.context.dateRangeStart)} - ${formatDate(report.context.dateRangeEnd)}`],
    ["Generated", formatDate(report.createdAt)],
    [],
    ["AI Summary", report.aiSummary || ""],
  ];
  const coverSheet = XLSX.utils.aoa_to_sheet(coverRows);
  coverSheet["!cols"] = [{ wch: 18 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, coverSheet, sanitizeSheetName("Cover", takenNames));

  const sortedSections = [...report.sections].sort((a, b) => a.order - b.order);

  for (const section of sortedSections) {
    const blocks = htmlToBlocks(section.html);
    const sheetName = sanitizeSheetName(section.title, takenNames);

    const tableBlocks = blocks.filter((b) => b.kind === "table");
    const textBlocks = blocks.filter((b) => b.kind === "paragraph" || b.kind === "list");

    let aoa: (string | number)[][];

    if (tableBlocks.length > 0) {
      aoa = [];
      for (const block of tableBlocks) {
        if (block.kind !== "table") continue;
        if (block.headers.length) aoa.push(block.headers);
        aoa.push(...block.rows);
        aoa.push([]);
      }
      for (const block of textBlocks) {
        if (block.kind === "paragraph") aoa.push([block.text]);
        else if (block.kind === "list") block.items.forEach((item) => aoa.push([`• ${item}`]));
      }
    } else {
      aoa = textBlocks.flatMap((block) => {
        if (block.kind === "paragraph") return [[block.text]];
        if (block.kind === "list") return block.items.map((item) => [`• ${item}`]);
        return [];
      });
      if (aoa.length === 0) aoa = [["No content"]];
    }

    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const maxCols = Math.max(1, ...aoa.map((row) => row.length));
    sheet["!cols"] = Array.from({ length: maxCols }, () => ({ wch: 28 }));
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  return workbook;
}

export async function downloadReportExcel(report: GeneratedReport, filename: string): Promise<void> {
  const [XLSX, workbook] = await Promise.all([import("xlsx"), buildReportWorkbook(report)]);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
