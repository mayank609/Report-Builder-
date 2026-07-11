import { NextRequest, NextResponse } from "next/server";

import { generateTemplateImportSuggestion, resolveApiKey } from "@/lib/ai/gemini";
import { extractDocxTheme, type ExtractedDocumentTheme } from "@/lib/office/docx-theme";
import { extractPdfTheme } from "@/lib/office/pdf-theme";
import type { DocumentKind } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 15 * 1024 * 1024;

interface ExtractedContent {
  text: string;
  theme: ExtractedDocumentTheme | null;
}

async function extractContent(file: File): Promise<ExtractedContent> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const [textResult, theme] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      extractDocxTheme(buffer),
    ]);
    return { text: textResult.value, theme };
  }

  if (name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      let theme: ExtractedDocumentTheme | null = null;
      try {
        const screenshot = await parser.getScreenshot({ desiredWidth: 300, partial: [1] });
        const pageImage = screenshot.pages[0]?.data;
        if (pageImage) theme = await extractPdfTheme(Buffer.from(pageImage));
      } catch {
        // Design-matching is a best-effort enhancement — a rendering
        // failure here shouldn't block the (already extracted) text import.
        theme = null;
      }
      return { text: textResult.text, theme };
    } finally {
      await parser.destroy();
    }
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return { text: buffer.toString("utf-8"), theme: null };
  }

  throw new Error("Unsupported file type. Please upload a .docx, .pdf, or .txt file.");
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  const documentKind = (formData.get("documentKind") as string | null) || "report";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please attach a file to import." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 15MB)." }, { status: 400 });
  }
  if (documentKind !== "report" && documentKind !== "invoice") {
    return NextResponse.json({ error: "Invalid document kind." }, { status: 400 });
  }

  let extracted: ExtractedContent;
  try {
    extracted = await extractContent(file);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read the uploaded file." },
      { status: 400 }
    );
  }

  const headerKey = request.headers.get("x-gemini-api-key");
  const apiKey = resolveApiKey(headerKey);

  try {
    const suggestion = await generateTemplateImportSuggestion(
      extracted.text,
      documentKind as DocumentKind,
      apiKey
    );
    return NextResponse.json({ ...suggestion, extractedTheme: extracted.theme });
  } catch (error) {
    console.error("import-template error", error);
    return NextResponse.json(
      { error: "Failed to generate a template from this document. Please try again." },
      { status: 500 }
    );
  }
}
