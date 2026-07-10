/**
 * Parses a report section's rendered HTML fragment (always our own
 * consistent output — semantic <table>/<p>/<ul> — whether it came from
 * Gemini or the local fallback generator) into a small set of structured
 * blocks. Shared by the Excel and Word exporters so both read from exactly
 * what's shown in the preview/PDF, with no separate data-fetching path to
 * drift out of sync. Client-side only (uses DOMParser).
 */

export type ExportBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "image"; note: string };

function cellText(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function parseTable(table: HTMLTableElement): ExportBlock {
  const theadCells = Array.from(table.querySelectorAll("thead th"));
  const headers = theadCells.map(cellText);

  const bodyRowEls = theadCells.length
    ? Array.from(table.querySelectorAll("tbody tr"))
    : Array.from(table.querySelectorAll("tr"));

  const rows = bodyRowEls.map((tr) => Array.from(tr.children).map(cellText));

  return { kind: "table", headers, rows };
}

export function htmlToBlocks(html: string): ExportBlock[] {
  if (typeof DOMParser === "undefined") return [{ kind: "paragraph", text: html.replace(/<[^>]+>/g, " ").trim() }];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: ExportBlock[] = [];

  for (const el of Array.from(doc.body.children)) {
    if (el.tagName === "TABLE") {
      blocks.push(parseTable(el as HTMLTableElement));
    } else if (el.tagName === "UL" || el.tagName === "OL") {
      const items = Array.from(el.querySelectorAll("li")).map(cellText).filter(Boolean);
      if (items.length) blocks.push({ kind: "list", items });
    } else if (el.tagName === "DIV" && el.classList.contains("report-chart")) {
      blocks.push({ kind: "image", note: "[Chart shown in the PDF/preview — not included in this export]" });
    } else if (el.tagName === "DIV" && el.querySelector("img")) {
      // Signature blocks and similar image-bearing divs.
      blocks.push({ kind: "image", note: "[Image shown in the PDF/preview — not included in this export]" });
    } else {
      const text = cellText(el);
      if (text) blocks.push({ kind: "paragraph", text });
    }
  }

  return blocks;
}
