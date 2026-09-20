export type ProjectRecordType =
  | "daily_site"
  | "rfi"
  | "inspection"
  | "hse_safety"
  | "material"
  | "labour"
  | "equipment"
  | "meeting"
  | "site_instruction"
  | "change_order"
  | "punch_list"
  | "permit";

export type RecordStatus =
  | "open"
  | "in_progress"
  | "pending_review"
  | "approved"
  | "closed";

export type RecordPriority = "low" | "medium" | "high" | "urgent";

export interface RecordAttachment {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: string;
}

export interface ProjectRecord {
  id: string;
  referenceNumber: string; // e.g. DSR-0001, RFI-0001
  projectId: string;
  projectName?: string;
  type: ProjectRecordType;
  date: string; // YYYY-MM-DD
  status: RecordStatus;
  priority: RecordPriority;
  responsiblePerson: string;
  title: string;
  notes: string;
  attachments: RecordAttachment[];
  data: Record<string, any>; // type-specific payload
  createdAt: string;
  updatedAt: string;
}

export interface RecordTypeConfig {
  type: ProjectRecordType;
  label: string;
  prefix: string;
  description: string;
  color: string;
  bgColor: string;
}

export const RECORD_TYPE_CONFIGS: Record<ProjectRecordType, RecordTypeConfig> = {
  daily_site: {
    type: "daily_site",
    label: "Daily Site Record",
    prefix: "DSR",
    description: "Daily weather, site conditions, work executed, and workforce logs",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  rfi: {
    type: "rfi",
    label: "RFI (Request for Information)",
    prefix: "RFI",
    description: "Technical clarification inquiries between contractor, client, and engineer",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10 border-amber-500/20",
  },
  inspection: {
    type: "inspection",
    label: "Quality Inspection",
    prefix: "INSP",
    description: "Quality assurance audits, stage check-offs, and compliance verification",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
  },
  hse_safety: {
    type: "hse_safety",
    label: "HSE / Safety Incident",
    prefix: "HSE",
    description: "Safety inspections, hazard notices, near-misses, and incident reports",
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/20",
  },
  material: {
    type: "material",
    label: "Material Delivery & Test",
    prefix: "MAT",
    description: "Inbound material dispatches, batch test certificates, and inventory consumption",
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10 border-indigo-500/20",
  },
  labour: {
    type: "labour",
    label: "Labour & Manpower",
    prefix: "LAB",
    description: "Trade-wise workforce headcount, subcontractor deployment, and hours worked",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
  },
  equipment: {
    type: "equipment",
    label: "Plant & Equipment",
    prefix: "EQP",
    description: "Heavy machinery on site, operating hours, maintenance, and idle time",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10 border-orange-500/20",
  },
  meeting: {
    type: "meeting",
    label: "Meeting Minutes (MoM)",
    prefix: "MTG",
    description: "Site coordination meetings, client briefings, and engineering reviews",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  site_instruction: {
    type: "site_instruction",
    label: "Site Instruction",
    prefix: "SI",
    description: "Direct engineering orders, drawing revisions, and field task directives",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10 border-teal-500/20",
  },
  change_order: {
    type: "change_order",
    label: "Change Order / Variation",
    prefix: "CO",
    description: "Scope modifications, cost impact assessments, and time extension requests",
    color: "text-violet-500",
    bgColor: "bg-violet-500/10 border-violet-500/20",
  },
  punch_list: {
    type: "punch_list",
    label: "Punch List / Snagging",
    prefix: "PL",
    description: "Defect rectification list, snagging items, and handover check items",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10 border-pink-500/20",
  },
  permit: {
    type: "permit",
    label: "Work Permit / Clearance",
    prefix: "PRM",
    description: "Hot work, height clearance, excavation permits, and municipal licenses",
    color: "text-lime-600",
    bgColor: "bg-lime-600/10 border-lime-600/20",
  },
};

export const RECORD_STATUS_CONFIG: Record<
  RecordStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" }
> = {
  open: { label: "Open", variant: "outline" },
  in_progress: { label: "In Progress", variant: "secondary" },
  pending_review: { label: "Pending Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  closed: { label: "Closed", variant: "default" },
};

export const RECORD_PRIORITY_CONFIG: Record<
  RecordPriority,
  { label: string; color: string }
> = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-blue-500" },
  high: { label: "High", color: "text-amber-500" },
  urgent: { label: "Urgent", color: "text-red-500 font-semibold" },
};
