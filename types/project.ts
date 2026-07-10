export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "delayed";

export interface ProjectMaterialUsage {
  material: string;
  unit: string;
  planned: number;
  used: number;
  remaining: number;
}

export interface ProjectEquipment {
  name: string;
  type: string;
  quantity: number;
  hoursUsed: number;
  status: "operational" | "under_maintenance" | "idle";
}

export interface ProjectLabour {
  role: string;
  headcount: number;
  hoursLogged: number;
  shift: string;
}

export interface ProjectBudgetLine {
  category: string;
  allocated: number;
  spent: number;
}

export interface ProjectMilestone {
  name: string;
  plannedDate: string;
  actualDate: string | null;
  status: "completed" | "in_progress" | "upcoming" | "delayed";
}

export interface ProjectDailyLog {
  date: string;
  weather: string;
  workCompleted: string;
  crewOnSite: number;
  hoursWorked: number;
  incidents: string;
}

export interface ProjectWeatherEntry {
  date: string;
  conditions: string;
  tempHighF: number;
  tempLowF: number;
  precipitationIn: number;
  windMph: number;
  workableHours: number;
  delayNotes: string;
}

export interface ProjectRfi {
  id: string;
  subject: string;
  dateSubmitted: string;
  submittedBy: string;
  assignedTo: string;
  status: "open" | "answered" | "closed";
  response: string;
  dateAnswered: string | null;
  costImpact: number;
  scheduleImpactDays: number;
}

export interface ProjectChangeOrder {
  id: string;
  description: string;
  date: string;
  requestedBy: string;
  costImpact: number;
  scheduleImpactDays: number;
  status: "pending" | "approved" | "rejected";
}

export interface ProjectSubmittal {
  id: string;
  name: string;
  type: string;
  submittedDate: string;
  reviewer: string;
  status: "pending" | "approved" | "approved_as_noted" | "revise_resubmit" | "rejected";
  dueDate: string;
}

export interface ProjectSafetyIncident {
  date: string;
  type: "near_miss" | "incident" | "toolbox_talk" | "safety_inspection";
  description: string;
  severity: "low" | "medium" | "high";
  involvedParty: string;
  correctiveAction: string;
  status: "open" | "resolved";
}

export interface ProjectQualityInspection {
  date: string;
  area: string;
  inspector: string;
  result: "pass" | "fail" | "conditional_pass";
  deficiencies: string;
  reinspectionDate: string | null;
}

export interface ProjectPunchListItem {
  id: string;
  area: string;
  item: string;
  trade: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "closed";
  assignedTo: string;
  dueDate: string;
}

export interface ProjectDelivery {
  date: string;
  vendor: string;
  material: string;
  quantity: number;
  unit: string;
  condition: "good" | "damaged" | "partial";
  receivedBy: string;
}

export interface ProjectSubcontractorLogEntry {
  date: string;
  contractor: string;
  trade: string;
  crewSize: number;
  scopeToday: string;
  status: "on_schedule" | "delayed" | "ahead";
}

export interface ProjectPermit {
  type: string;
  permitNumber: string;
  status: "approved" | "pending" | "expired";
  issueDate: string | null;
  expiryDate: string | null;
  lastInspectionType: string;
  lastInspectionDate: string | null;
  lastInspectionResult: "pass" | "fail" | "scheduled" | "n/a";
}

export interface ProjectRisk {
  id: string;
  category: string;
  description: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
  owner: string;
  status: "open" | "mitigated" | "closed";
}

export interface ProjectLookAheadActivity {
  activity: string;
  trade: string;
  plannedStart: string;
  plannedEnd: string;
  notes: string;
}

export interface ProjectVisitorLogEntry {
  date: string;
  visitorName: string;
  company: string;
  purpose: string;
  timeIn: string;
  timeOut: string;
  escortedBy: string;
}

export interface Project {
  id: string;
  name: string;
  projectCode: string;
  builderId: string;
  clientId: string;
  contractorIds: string[];
  engineerIds: string[];
  type: string;
  status: ProjectStatus;
  address: string;
  city: string;
  state: string;
  startDate: string;
  estimatedEndDate: string;
  actualEndDate: string | null;
  totalBudget: number;
  spentBudget: number;
  percentComplete: number;
  description: string;
  siteAreaSqft: number;
  floors: number;
  units: number;
  materialUsage: ProjectMaterialUsage[];
  equipment: ProjectEquipment[];
  labour: ProjectLabour[];
  budgetBreakdown: ProjectBudgetLine[];
  milestones: ProjectMilestone[];
  dailyLogs: ProjectDailyLog[];
  images: { url: string; caption: string; capturedAt: string }[];
  weatherLog: ProjectWeatherEntry[];
  rfis: ProjectRfi[];
  changeOrders: ProjectChangeOrder[];
  submittals: ProjectSubmittal[];
  safetyIncidents: ProjectSafetyIncident[];
  qualityInspections: ProjectQualityInspection[];
  punchList: ProjectPunchListItem[];
  deliveries: ProjectDelivery[];
  subcontractorLog: ProjectSubcontractorLogEntry[];
  permits: ProjectPermit[];
  risks: ProjectRisk[];
  lookAheadSchedule: ProjectLookAheadActivity[];
  visitorLog: ProjectVisitorLogEntry[];
}
