import { createCanvas, loadImage } from "@napi-rs/canvas";

import type { ThemeColors } from "@/types";

export interface ExtractedDocumentTheme {
  colors: ThemeColors;
  font: null;
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => n.toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Rounds a channel to reduce near-duplicate colors into shared buckets. */
function quantizeChannel(value: number, step = 24): number {
  return Math.min(255, Math.round(value / step) * step);
}

/**
 * Renders the first page of a PDF and buckets its pixels to find the most
 * common background, text, and accent colors — used to give an imported
 * invoice/report template a starting palette that resembles the source
 * document's branding. Plain black-and-white documents legitimately yield no
 * accent color, in which case this returns null and the default theme is
 * kept.
 */
export async function extractPdfTheme(pngBuffer: Buffer): Promise<ExtractedDocumentTheme | null> {
  try {
    const image = await loadImage(pngBuffer);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = canvas.data();

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    const rowStride = image.width * 4;
    // Sample every 3rd pixel in both dimensions — plenty for a palette, and
    // far cheaper than reading every pixel of a full-resolution page.
    for (let y = 0; y < image.height; y += 3) {
      for (let x = 0; x < image.width; x += 3) {
        const i = y * rowStride + x * 4;
        const a = pixels[i + 3];
        if (a < 200) continue;
        const r = quantizeChannel(pixels[i]);
        const g = quantizeChannel(pixels[i + 1]);
        const b = quantizeChannel(pixels[i + 2]);
        const key = `${r},${g},${b}`;
        const entry = buckets.get(key);
        if (entry) entry.count += 1;
        else buckets.set(key, { count: 1, r, g, b });
      }
    }

    const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
    if (sorted.length === 0) return null;

    const isNearWhite = (c: { r: number; g: number; b: number }) =>
      c.r > 232 && c.g > 232 && c.b > 232;
    const isNearBlack = (c: { r: number; g: number; b: number }) =>
      c.r < 24 && c.g < 24 && c.b < 24;
    const chroma = (c: { r: number; g: number; b: number }) =>
      Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);

    const background = sorted.find(isNearWhite) ?? sorted[0];
    const text = sorted.find(isNearBlack) ?? sorted[sorted.length - 1];
    const accents = sorted
      .filter((c) => !isNearWhite(c) && !isNearBlack(c) && chroma(c) > 28)
      .slice(0, 2);

    // A plain black-on-white document has no branded accent color to lift —
    // don't fabricate one, just leave the template's default theme in place.
    if (accents.length === 0) return null;

    const colors: ThemeColors = {
      primary: toHex(accents[0].r, accents[0].g, accents[0].b),
      secondary: toHex(text.r, text.g, text.b),
      accent: toHex(
        (accents[1] ?? accents[0]).r,
        (accents[1] ?? accents[0]).g,
        (accents[1] ?? accents[0]).b
      ),
      text: toHex(text.r, text.g, text.b),
      background: toHex(background.r, background.g, background.b),
    };

    return { colors, font: null };
  } catch {
    return null;
  }
}
