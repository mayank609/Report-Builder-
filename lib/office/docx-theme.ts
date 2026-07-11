import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

import type { ThemeColors } from "@/types";

export interface ExtractedDocumentTheme {
  colors: ThemeColors;
  font: string | null;
}

function readSchemeColor(doc: Document, tag: string): string | null {
  const wrapper = doc.getElementsByTagName(`a:${tag}`)[0];
  if (!wrapper) return null;
  const srgb = wrapper.getElementsByTagName("a:srgbClr")[0];
  const val = srgb?.getAttribute("val") ?? wrapper.getElementsByTagName("a:sysClr")[0]?.getAttribute("lastClr");
  return val ? `#${val.toUpperCase()}` : null;
}

function readFontTypeface(doc: Document, fontSchemeTag: "a:majorFont" | "a:minorFont"): string | null {
  const node = doc.getElementsByTagName(fontSchemeTag)[0];
  const typeface = node?.getElementsByTagName("a:latin")[0]?.getAttribute("typeface");
  return typeface && !typeface.startsWith("+") ? typeface : null;
}

/**
 * Reads the color/font theme Word embeds in every .docx (word/theme/theme1.xml)
 * so an imported template can start out looking like the source document's
 * branding, while still being fully editable afterward.
 */
export async function extractDocxTheme(buffer: Buffer): Promise<ExtractedDocumentTheme | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const themeEntry = Object.keys(zip.files).find((name) =>
      /^word\/theme\/theme\d*\.xml$/i.test(name)
    );
    if (!themeEntry) return null;

    const xml = await zip.files[themeEntry].async("string");
    const doc = new DOMParser().parseFromString(xml, "text/xml");

    const dk1 = readSchemeColor(doc, "dk1");
    const lt1 = readSchemeColor(doc, "lt1");
    const dk2 = readSchemeColor(doc, "dk2");
    const accent1 = readSchemeColor(doc, "accent1");
    const accent2 = readSchemeColor(doc, "accent2");

    if (!accent1 && !dk1) return null;

    const colors: ThemeColors = {
      primary: accent1 ?? dk2 ?? "#1E3A8A",
      secondary: dk2 ?? dk1 ?? "#1F2937",
      accent: accent2 ?? accent1 ?? "#0EA5E9",
      text: dk1 ?? "#111827",
      background: lt1 ?? "#FFFFFF",
    };

    const font = readFontTypeface(doc, "a:minorFont") ?? readFontTypeface(doc, "a:majorFont");

    return { colors, font };
  } catch {
    return null;
  }
}
