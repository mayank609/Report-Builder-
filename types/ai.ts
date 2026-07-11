import type { SectionType } from "./section";
import type { DocumentKind, ReportType, ThemeColors } from "./template";

export interface AiSectionSuggestion {
  type: SectionType;
  title: string;
  description: string;
}

export interface AiTemplateSuggestion {
  name: string;
  reportType: ReportType;
  description: string;
  sections: AiSectionSuggestion[];
  recommendedTables: string[];
  formattingNotes: string;
  summaryPrompts: string[];
  source: "gemini" | "fallback";
}

export interface AiReportSectionResult {
  sectionId: string;
  html: string;
}

export interface AiReportSuggestion {
  sections: AiReportSectionResult[];
  aiSummary: string;
  source: "gemini" | "fallback";
}

export interface AiTemplateImportSuggestion {
  documentKind: DocumentKind;
  name: string;
  description: string;
  formattingNotes: string;
  source: "gemini" | "fallback";
  /** report kind only */
  reportType?: ReportType;
  sections?: AiSectionSuggestion[];
  /** invoice kind only */
  termsAndConditions?: string;
  notes?: string;
  detectedGstin?: string | null;
  /**
   * Colors/font lifted directly from the uploaded document (docx theme XML,
   * or a dominant-color scan of a rendered PDF page). Null when the source
   * has no detectable branding (e.g. plain black-on-white text) — the
   * template's default theme is left untouched in that case.
   */
  extractedTheme?: { colors: ThemeColors; font: string | null } | null;
}
