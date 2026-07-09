import type { SectionType } from "./section";
import type { ReportType } from "./template";

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
