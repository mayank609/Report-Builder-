"use client";

import { settingsService } from "@/services";
import type {
  AiReportSuggestion,
  AiTemplateImportSuggestion,
  AiTemplateSuggestion,
  DocumentKind,
  Project,
  ReportTemplate,
} from "@/types";

async function withApiKeyHeaders(): Promise<HeadersInit> {
  const settings = await settingsService.get();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (settings.geminiApiKey) {
    headers["x-gemini-api-key"] = settings.geminiApiKey;
  }
  return headers;
}

async function apiKeyHeaderOnly(): Promise<HeadersInit> {
  const settings = await settingsService.get();
  return settings.geminiApiKey ? { "x-gemini-api-key": settings.geminiApiKey } : {};
}

export async function generateTemplateFromPrompt(prompt: string): Promise<AiTemplateSuggestion> {
  const headers = await withApiKeyHeaders();
  const res = await fetch("/api/ai/generate-template", {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to generate template");
  }
  return res.json();
}

export async function generateReportFromContext(params: {
  template: ReportTemplate;
  project: Project;
  builderName: string;
  clientName: string | null;
  contractorName: string | null;
  engineerName: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
}): Promise<AiReportSuggestion> {
  const headers = await withApiKeyHeaders();
  const res = await fetch("/api/ai/generate-report", {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to generate report");
  }
  return res.json();
}

export async function importTemplateFromFile(
  file: File,
  documentKind: DocumentKind
): Promise<AiTemplateImportSuggestion> {
  const headers = await apiKeyHeaderOnly();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("documentKind", documentKind);

  const res = await fetch("/api/ai/import-template", {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to import template");
  }
  return res.json();
}
