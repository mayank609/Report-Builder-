import type { Db } from "mongodb";
import type { CreateProjectFromFinanceRequest, FinanceProjectMaster } from "@/integration/contract";
import { generateId } from "@/lib/utils";
import type { Builder, Client, Project, ProjectStatus } from "@/types";
import { projectPatchFromSnapshot } from "./apply-snapshot";

const STATUS_MAP: Record<FinanceProjectMaster["status"], ProjectStatus> = {
  planning: "planning",
  active: "in_progress",
  on_hold: "on_hold",
  completed: "completed",
  closed: "completed",
  cancelled: "on_hold",
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sameText(field: string, value: string) {
  return { [field]: { $regex: `^${escapeRegex(value.trim())}$`, $options: "i" } };
}

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function findOrCreateBuilder(db: Db, company: CreateProjectFromFinanceRequest["company"], now: string) {
  const builders = db.collection<Builder>("builders");
  const companyName = company.legalName || company.name;
  const existing = await builders.findOne(sameText("companyName", companyName));
  if (existing) return existing.id;

  const builder: Builder & { createdAt: string; updatedAt: string } = {
    id: generateId("bui"),
    name: company.name,
    companyName,
    licenseNumber: "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    city: "",
    state: "",
    logoUrl: "",
    establishedYear: new Date(now).getFullYear(),
    specialization: [],
    pan: company.panNumber,
    gstBranches: [],
    createdAt: now,
    updatedAt: now,
  };
  await builders.insertOne(builder);
  return builder.id;
}

async function findOrCreateClient(db: Db, client: NonNullable<FinanceProjectMaster["client"]>, now: string) {
  const clients = db.collection<Client>("clients");
  const existing = await clients.findOne(sameText("companyName", client.companyName));
  if (existing) return existing.id;

  const created: Client & { createdAt: string; updatedAt: string } = {
    id: generateId("cli"),
    name: client.name,
    companyName: client.companyName,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    clientType: client.type,
    gstin: client.gstNumber,
    billingState: client.state,
    createdAt: now,
    updatedAt: now,
  };
  await clients.insertOne(created);
  return created.id;
}

/**
 * Creates (or, if already linked, refreshes) the Report Builder project for a
 * Finance project, including its client and builder, then applies the
 * financial snapshot. Idempotent on the Finance project id.
 */
export async function createOrUpdateProjectFromFinance(
  db: Db,
  body: CreateProjectFromFinanceRequest
): Promise<{ project: Project; created: boolean }> {
  const { project: master, company, snapshot } = body;
  const now = new Date().toISOString();
  const projects = db.collection<Project>("projects");

  const linked = await projects.findOne({ "finance.financeProjectId": master.id });
  if (linked) {
    const patch = projectPatchFromSnapshot(linked, snapshot, now);
    await projects.updateOne({ id: linked.id }, { $set: { ...patch, updatedAt: now } });
    return { project: { ...linked, ...patch } as Project, created: false };
  }

  const [builderId, clientId] = await Promise.all([
    findOrCreateBuilder(db, company, now),
    master.client ? findOrCreateClient(db, master.client, now) : Promise.resolve(""),
  ]);

  const base: Project = {
    id: generateId("pro"),
    name: master.name,
    projectCode: master.code,
    builderId,
    clientId,
    contractorIds: [],
    engineerIds: [],
    type: titleCase(master.type),
    status: STATUS_MAP[master.status],
    address: [master.address.line1, master.address.line2].filter(Boolean).join(", "),
    city: master.address.city,
    state: master.address.state,
    startDate: master.startDate.slice(0, 10),
    estimatedEndDate: master.targetEndDate.slice(0, 10),
    actualEndDate: master.actualEndDate ? master.actualEndDate.slice(0, 10) : null,
    totalBudget: 0,
    spentBudget: 0,
    percentComplete: Math.round(master.progressPercent),
    description: master.description,
    siteAreaSqft: 0,
    floors: 0,
    units: 0,
    materialUsage: [],
    equipment: [],
    labour: [],
    budgetBreakdown: [],
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

  const project = { ...base, ...projectPatchFromSnapshot(base, snapshot, now) } as Project;
  await projects.insertOne({ ...project, createdAt: now, updatedAt: now } as Project);
  return { project, created: true };
}
