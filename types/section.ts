export type SectionType =
  | "project_information"
  | "client_information"
  | "builder_information"
  | "contractor_information"
  | "engineer_information"
  | "daily_progress"
  | "weekly_progress"
  | "material_usage"
  | "equipment"
  | "labour"
  | "budget"
  | "timeline"
  | "images"
  | "ai_summary"
  | "recommendations"
  | "signature"
  | "appendix";

export interface SectionCatalogEntry {
  type: SectionType;
  label: string;
  description: string;
  icon: string;
  defaultTitle: string;
}

export interface TemplateSection {
  id: string;
  type: SectionType;
  title: string;
  description: string;
  required: boolean;
  editable: boolean;
  visible: boolean;
  collapsed: boolean;
  order: number;
}
