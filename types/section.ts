export type SectionType =
  | "project_information"
  | "client_information"
  | "builder_information"
  | "contractor_information"
  | "engineer_information"
  | "weather_conditions"
  | "daily_progress"
  | "weekly_progress"
  | "look_ahead_schedule"
  | "material_usage"
  | "deliveries"
  | "equipment"
  | "labour"
  | "subcontractor_log"
  | "budget"
  | "cost_forecast"
  | "timeline"
  | "change_orders"
  | "rfi_log"
  | "submittals"
  | "quality_inspection"
  | "punch_list"
  | "safety_incidents"
  | "permits_compliance"
  | "risk_register"
  | "visitor_log"
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

export type SectionWidth = "full" | "half";

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
  width: SectionWidth;
}
