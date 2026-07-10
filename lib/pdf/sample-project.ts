import type { Project } from "@/types";

/**
 * A fully-formed but generic sample Project, used only to drive chart
 * generation (and, in future, other data-shaped previews) in the Template
 * Builder's live preview panel — before any real project has been selected.
 * Figures are kept consistent with the sample table content in
 * lib/pdf/sample-section-content.ts.
 */
export const SAMPLE_PROJECT: Project = {
  id: "sample",
  name: "Sample Project",
  projectCode: "PRJ-0001",
  builderId: "sample",
  clientId: "sample",
  contractorIds: [],
  engineerIds: [],
  type: "Residential",
  status: "in_progress",
  address: "123 Main Street",
  city: "Sample City",
  state: "ST",
  startDate: "2026-01-01",
  estimatedEndDate: "2026-12-01",
  actualEndDate: null,
  totalBudget: 4200000,
  spentBudget: 2730000,
  percentComplete: 65,
  description: "Sample project used to preview report templates.",
  siteAreaSqft: 6000,
  floors: 3,
  units: 1,
  materialUsage: [
    { material: "Ready-Mix Concrete", unit: "cu yd", planned: 500, used: 320, remaining: 180 },
    { material: "Framing Lumber", unit: "board ft", planned: 60000, used: 38000, remaining: 22000 },
  ],
  equipment: [],
  labour: [
    { role: "Carpenters", headcount: 12, hoursLogged: 1920, shift: "Day" },
    { role: "Electricians", headcount: 5, hoursLogged: 800, shift: "Day" },
  ],
  budgetBreakdown: [
    { category: "Site Work & Foundation", allocated: 620000, spent: 598000 },
    { category: "Structural Framing", allocated: 980000, spent: 640000 },
  ],
  milestones: [],
  dailyLogs: [],
  images: [],
  weatherLog: [],
  rfis: [],
  changeOrders: [],
  submittals: [],
  safetyIncidents: [],
  qualityInspections: [],
  punchList: [],
  deliveries: [],
  subcontractorLog: [],
  permits: [],
  risks: [],
  lookAheadSchedule: [],
  visitorLog: [],
};
