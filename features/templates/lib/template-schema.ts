import { z } from "zod";

const SECTION_TYPES = [
  "project_information",
  "client_information",
  "builder_information",
  "contractor_information",
  "engineer_information",
  "weather_conditions",
  "daily_progress",
  "weekly_progress",
  "look_ahead_schedule",
  "material_usage",
  "deliveries",
  "equipment",
  "labour",
  "subcontractor_log",
  "budget",
  "cost_forecast",
  "financial_summary",
  "timeline",
  "change_orders",
  "rfi_log",
  "submittals",
  "quality_inspection",
  "punch_list",
  "safety_incidents",
  "permits_compliance",
  "risk_register",
  "visitor_log",
  "images",
  "ai_summary",
  "recommendations",
  "signature",
  "appendix",
] as const;

export const templateSectionSchema = z.object({
  id: z.string(),
  type: z.enum(SECTION_TYPES),
  title: z.string().min(1, "Section title is required"),
  description: z.string(),
  required: z.boolean(),
  editable: z.boolean(),
  visible: z.boolean(),
  collapsed: z.boolean(),
  order: z.number(),
  width: z.enum(["full", "half"]),
});

export const themeColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  text: z.string(),
  background: z.string(),
});

export const templateLayoutSchema = z.object({
  coverPage: z.boolean(),
  header: z.boolean(),
  footer: z.boolean(),
  logo: z.boolean(),
  watermark: z.boolean(),
  pageNumbers: z.boolean(),
  orientation: z.enum(["portrait", "landscape"]),
  font: z.string(),
  themeColors: themeColorsSchema,
});

export const invoiceTemplateDefaultsSchema = z.object({
  termsAndConditions: z.string(),
  notes: z.string(),
  numberingPrefix: z.string(),
  defaultGstBranchId: z.string().nullable(),
});

export const templateFormSchemaBase = z.object({
  name: z.string().min(3, "Template name must be at least 3 characters"),
  reportType: z.enum([
    "daily_progress",
    "weekly_progress",
    "monthly_progress",
    "inspection",
    "safety_audit",
    "quality_audit",
    "material_delivery",
    "final_completion",
    "custom",
  ]),
  description: z.string().max(500, "Keep the description under 500 characters"),
  status: z.enum(["draft", "published"]),
  documentKind: z.enum(["report", "invoice"]),
  origin: z.enum(["manual", "ai", "imported"]),
  invoiceDefaults: invoiceTemplateDefaultsSchema.nullable(),
  layout: templateLayoutSchema,
  sections: z.array(templateSectionSchema),
});

export const templateFormSchema = templateFormSchemaBase.superRefine((values, ctx) => {
  if (values.documentKind === "report" && values.sections.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "Add at least one section",
      path: ["sections"],
    });
  }
});

export type TemplateFormValues = z.infer<typeof templateFormSchemaBase>;
