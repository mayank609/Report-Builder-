import { NextRequest, NextResponse } from "next/server";

import { generateTemplateImportSuggestion, resolveApiKey } from "@/lib/ai/gemini";
import type { DocumentKind } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 15 * 1024 * 1024;

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (name.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return buffer.toString("utf-8");
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

  let extractedText: string;
  try {
    extractedText = await extractText(file);
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
      extractedText,
      documentKind as DocumentKind,
      apiKey
    );
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("import-template error", error);
    return NextResponse.json(
      { error: "Failed to generate a template from this document. Please try again." },
      { status: 500 }
    );
  }
}
