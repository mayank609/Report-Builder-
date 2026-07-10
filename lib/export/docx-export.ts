import type * as DocxType from "docx";

import { htmlToBlocks, type ExportBlock } from "./html-to-blocks";
import { formatDate } from "@/lib/utils";
import type { GeneratedReport } from "@/types";

const CELL_BORDER_COLOR = "E5E7EB";

function cellBorder(docx: typeof DocxType) {
  const border = { style: docx.BorderStyle.SINGLE, size: 2, color: CELL_BORDER_COLOR };
  return { top: border, bottom: border, left: border, right: border };
}

function headerCell(docx: typeof DocxType, text: string): DocxType.TableCell {
  return new docx.TableCell({
    borders: cellBorder(docx),
    shading: { fill: "F3F4F6" },
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text, bold: true, size: 20 })] })],
  });
}

function bodyCell(docx: typeof DocxType, text: string): DocxType.TableCell {
  return new docx.TableCell({
    borders: cellBorder(docx),
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text, size: 20 })] })],
  });
}

function blockToDocxElements(
  docx: typeof DocxType,
  block: ExportBlock
): (DocxType.Paragraph | DocxType.Table)[] {
  switch (block.kind) {
    case "paragraph":
      return [
        new docx.Paragraph({
          children: [new docx.TextRun({ text: block.text, size: 21 })],
          spacing: { after: 120 },
        }),
      ];
    case "list":
      return block.items.map(
        (item) => new docx.Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 60 } })
      );
    case "table": {
      const rows: DocxType.TableRow[] = [];
      if (block.headers.length) {
        rows.push(new docx.TableRow({ children: block.headers.map((h) => headerCell(docx, h)) }));
      }
      for (const row of block.rows) {
        rows.push(new docx.TableRow({ children: row.map((c) => bodyCell(docx, c)) }));
      }
      if (rows.length === 0) return [];
      return [
        new docx.Table({ width: { size: 100, type: docx.WidthType.PERCENTAGE }, rows }),
        new docx.Paragraph({ text: "", spacing: { after: 160 } }),
      ];
    }
    case "image":
      return [
        new docx.Paragraph({
          children: [new docx.TextRun({ text: block.note, italics: true, size: 19, color: "6B7280" })],
          spacing: { after: 120 },
        }),
      ];
    default:
      return [];
  }
}

/** docx (dolanmiu/docx) is loaded on demand so it never bloats the initial page bundle. */
export async function buildReportDocx(report: GeneratedReport): Promise<Blob> {
  const docx = await import("docx");
  const sortedSections = [...report.sections].sort((a, b) => a.order - b.order);

  const children: (DocxType.Paragraph | DocxType.Table)[] = [
    new docx.Paragraph({ text: report.name, heading: docx.HeadingLevel.TITLE }),
    new docx.Paragraph({ text: report.projectName, spacing: { after: 200 } }),
    new docx.Paragraph({
      children: [
        new docx.TextRun({ text: `Template: ${report.templateName}    `, size: 20, color: "6B7280" }),
        new docx.TextRun({
          text: `Report Period: ${formatDate(report.context.dateRangeStart)} - ${formatDate(report.context.dateRangeEnd)}`,
          size: 20,
          color: "6B7280",
        }),
      ],
      spacing: { after: 320 },
    }),
  ];

  for (const section of sortedSections) {
    children.push(
      new docx.Paragraph({
        text: section.title,
        heading: docx.HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 120 },
      })
    );
    const blocks = htmlToBlocks(section.html);
    for (const block of blocks) {
      children.push(...blockToDocxElements(docx, block));
    }
  }

  const doc = new docx.Document({
    sections: [{ properties: {}, children }],
  });

  return docx.Packer.toBlob(doc);
}

export async function downloadReportDocx(report: GeneratedReport, filename: string): Promise<void> {
  const blob = await buildReportDocx(report);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
