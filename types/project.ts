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
}
