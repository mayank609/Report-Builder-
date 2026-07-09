export type ReportStatus = "draft" | "generating" | "completed" | "failed";

export interface ReportSectionContent {
  sectionId: string;
  type: string;
  title: string;
  html: string;
  order: number;
}

export interface ReportGenerationContext {
  builderId: string;
  projectId: string;
  contractorId: string | null;
  clientId: string | null;
  engineerId: string | null;
  templateId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  projectId: string;
  projectName: string;
  builderId: string;
  clientId: string | null;
  contractorId: string | null;
  engineerId: string | null;
  reportType: string;
  status: ReportStatus;
  context: ReportGenerationContext;
  sections: ReportSectionContent[];
  layout: import("./template").TemplateLayout;
  aiSummary: string;
  createdAt: string;
  updatedAt: string;
}

export type ReportInput = Omit<GeneratedReport, "id" | "createdAt" | "updatedAt">;
