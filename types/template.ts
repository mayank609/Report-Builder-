import type { TemplateSection } from "./section";

export type ReportType =
  | "daily_progress"
  | "weekly_progress"
  | "monthly_progress"
  | "inspection"
  | "safety_audit"
  | "quality_audit"
  | "material_delivery"
  | "final_completion"
  | "custom";

export type PageOrientation = "portrait" | "landscape";

export type TemplateStatus = "draft" | "published";

export type DocumentKind = "report" | "invoice";

export type TemplateOrigin = "manual" | "ai" | "imported";

export interface InvoiceTemplateDefaults {
  termsAndConditions: string;
  notes: string;
  numberingPrefix: string;
  defaultGstBranchId: string | null;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

export interface TemplateLayout {
  coverPage: boolean;
  header: boolean;
  footer: boolean;
  logo: boolean;
  watermark: boolean;
  pageNumbers: boolean;
  orientation: PageOrientation;
  font: string;
  themeColors: ThemeColors;
}

export interface ReportTemplate {
  id: string;
  name: string;
  reportType: ReportType;
  description: string;
  status: TemplateStatus;
  documentKind: DocumentKind;
  origin: TemplateOrigin;
  invoiceDefaults: InvoiceTemplateDefaults | null;
  layout: TemplateLayout;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  aiGenerated: boolean;
  usageCount: number;
}

export type TemplateInput = Omit<
  ReportTemplate,
  "id" | "createdAt" | "updatedAt" | "usageCount"
>;
