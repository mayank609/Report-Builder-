import { z } from "zod";

const SECTION_TYPES = [
  "project_information",
  "client_information",
  "builder_information",
  "contractor_information",
  "engineer_information",
  "daily_progress",
  "weekly_progress",
  "material_usage",
  "equipment",
  "labour",
  "budget",
  "timeline",
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

export const templateFormSchema = z.object({
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
  layout: templateLayoutSchema,
  sections: z.array(templateSectionSchema).min(1, "Add at least one section"),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;
