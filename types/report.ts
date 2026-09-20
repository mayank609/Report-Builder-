import type { SectionType, SectionWidth } from "./section";

export type ReportLifecycleStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "signed"
  | "final";

export type ReportStatus =
  | ReportLifecycleStatus
  | "generating"
  | "completed"
  | "failed";

export interface ReportSectionContent {
  sectionId: string;
  type: SectionType;
  title: string;
  html: string;
  order: number;
  width: SectionWidth;
}

export interface ReportSignature {
  id: string;
  role: string;
  signerName: string;
  imageDataUrl: string;
  signedAt: string;
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
  recordIds?: string[];
}

export interface ReportVersionEntry {
  version: number;
  date: string;
  action: string;
  actor: string;
  summary?: string;
}

export interface GeneratedReport {
  id: string;
  reportNumber: string;
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
  version: number;
  versionHistory: ReportVersionEntry[];
  sourceRecordIds: string[];
  context: ReportGenerationContext;
  sections: ReportSectionContent[];
  layout: import("./template").TemplateLayout;
  aiSummary: string;
  signatures: ReportSignature[];
  createdAt: string;
  updatedAt: string;
}

export type ReportInput = Omit<
  GeneratedReport,
  "id" | "reportNumber" | "createdAt" | "updatedAt"
>;

