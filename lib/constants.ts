import type { ReportType, SectionCatalogEntry, ThemeColors } from "@/types";

export const SECTION_CATALOG: SectionCatalogEntry[] = [
  {
    type: "project_information",
    label: "Project Information",
    description: "Core project details: name, code, address, dates, status.",
    icon: "Building2",
    defaultTitle: "Project Information",
  },
  {
    type: "client_information",
    label: "Client Information",
    description: "Client contact details and ownership information.",
    icon: "UserRound",
    defaultTitle: "Client Information",
  },
  {
    type: "builder_information",
    label: "Builder Information",
    description: "General contractor company and licensing details.",
    icon: "HardHat",
    defaultTitle: "Builder Information",
  },
  {
    type: "contractor_information",
    label: "Contractor Information",
    description: "Subcontractor trades, licensing and contact info.",
    icon: "Wrench",
    defaultTitle: "Contractor Information",
  },
  {
    type: "engineer_information",
    label: "Engineer Information",
    description: "Engineer of record, discipline and license details.",
    icon: "Ruler",
    defaultTitle: "Engineer Information",
  },
  {
    type: "daily_progress",
    label: "Daily Progress",
    description: "Work completed, weather, crew and hours for the day.",
    icon: "CalendarDays",
    defaultTitle: "Daily Progress Summary",
  },
  {
    type: "weekly_progress",
    label: "Weekly Progress",
    description: "Rollup of work completed across the reporting week.",
    icon: "CalendarRange",
    defaultTitle: "Weekly Progress Summary",
  },
  {
    type: "material_usage",
    label: "Material Usage",
    description: "Planned vs. used quantities for key materials.",
    icon: "Package",
    defaultTitle: "Material Usage",
  },
  {
    type: "equipment",
    label: "Equipment",
    description: "Equipment on site, utilization and operational status.",
    icon: "Forklift",
    defaultTitle: "Equipment Utilization",
  },
  {
    type: "labour",
    label: "Labour",
    description: "Headcount and hours logged by trade and shift.",
    icon: "Users",
    defaultTitle: "Labour on Site",
  },
  {
    type: "budget",
    label: "Budget",
    description: "Budget allocation and spend broken down by category.",
    icon: "CircleDollarSign",
    defaultTitle: "Budget Status",
  },
  {
    type: "timeline",
    label: "Timeline",
    description: "Milestones with planned vs. actual dates and status.",
    icon: "GanttChartSquare",
    defaultTitle: "Milestone Timeline",
  },
  {
    type: "images",
    label: "Images",
    description: "Site photographs with captions and capture dates.",
    icon: "Image",
    defaultTitle: "Site Photos",
  },
  {
    type: "ai_summary",
    label: "AI Summary",
    description: "AI-generated executive summary of the report period.",
    icon: "Sparkles",
    defaultTitle: "AI Summary",
  },
  {
    type: "recommendations",
    label: "Recommendations",
    description: "Findings, risks and recommended next actions.",
    icon: "ListChecks",
    defaultTitle: "Recommendations",
  },
  {
    type: "signature",
    label: "Signature",
    description: "Sign-off block for supervisors and inspectors.",
    icon: "PenLine",
    defaultTitle: "Sign-Off",
  },
  {
    type: "appendix",
    label: "Appendix",
    description: "Supporting documents, references and attachments.",
    icon: "Paperclip",
    defaultTitle: "Appendix",
  },
];

export const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "daily_progress", label: "Daily Progress Report" },
  { value: "weekly_progress", label: "Weekly Progress Report" },
  { value: "monthly_progress", label: "Monthly Progress Report" },
  { value: "inspection", label: "Inspection Report" },
  { value: "safety_audit", label: "Safety Audit" },
  { value: "quality_audit", label: "Quality Audit" },
  { value: "material_delivery", label: "Material Delivery Report" },
  { value: "final_completion", label: "Final Completion Report" },
  { value: "custom", label: "Custom Report" },
];

export const FONT_OPTIONS = [
  "Inter",
  "Roboto",
  "Georgia",
  "Times New Roman",
  "Helvetica",
  "Lato",
] as const;

export const THEME_PRESETS: { name: string; colors: ThemeColors }[] = [
  {
    name: "Blueprint Blue",
    colors: { primary: "#1d4ed8", secondary: "#0f172a", accent: "#f59e0b", text: "#111827", background: "#ffffff" },
  },
  {
    name: "Site Teal",
    colors: { primary: "#0f766e", secondary: "#0f172a", accent: "#f97316", text: "#111827", background: "#ffffff" },
  },
  {
    name: "Safety Red",
    colors: { primary: "#b91c1c", secondary: "#111827", accent: "#f59e0b", text: "#111827", background: "#ffffff" },
  },
  {
    name: "Concrete Gray",
    colors: { primary: "#334155", secondary: "#0f172a", accent: "#0ea5e9", text: "#111827", background: "#ffffff" },
  },
  {
    name: "Forest",
    colors: { primary: "#166534", secondary: "#14532d", accent: "#eab308", text: "#111827", background: "#ffffff" },
  },
];

export const DEFAULT_THEME_COLORS: ThemeColors = THEME_PRESETS[0].colors;
