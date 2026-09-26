/**
 * BuildFin <-> BuildReport integration contract (v1).
 *
 * This file is intentionally byte-identical in both repositories
 * (Finance-Module/integration/contract.ts and Report-Builder-/integration/contract.ts).
 * CI in each repo verifies its SHA-256 against integration/contract.sha256 so the
 * two modules can never silently drift. To change the contract: bump
 * FINANCE_CONTRACT_VERSION for breaking changes, edit both copies, and update
 * both checksum files (`npm run contract:hash`).
 *
 * Ownership model (mirrors how large construction platforms split tools):
 *   - Finance (BuildFin) is the system of record for money: budgets, commitments,
 *     actual cost, billing, collections, retention and change-order values.
 *   - Report Builder (BuildReport) is the system of record for field execution and
 *     documents: daily logs, site records, templates and generated reports.
 * Finance publishes a read-only snapshot per project; Report Builder never edits it.
 */
import { z } from "zod";

export const FINANCE_CONTRACT_VERSION = 1 as const;

const money = z.number().finite();
const nonNegativeMoney = z.number().finite().nonnegative();
const percent = z.number().finite().min(-1000).max(1000);
const isoDate = z.string().min(4).max(40);
const shortText = z.string().max(200);

export const financeCategoryLineSchema = z.object({
  category: shortText,
  allocated: nonNegativeMoney,
  committed: nonNegativeMoney,
  actual: nonNegativeMoney,
});

export const financeChangeOrderSchema = z.object({
  id: shortText,
  number: shortText,
  title: shortText,
  requestedBy: shortText,
  date: isoDate,
  costImpact: money,
  scheduleImpactDays: z.number().int().min(-3650).max(3650),
  status: z.enum(["pending", "approved", "rejected"]),
});

export const financeCashFlowPointSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  inflow: nonNegativeMoney,
  outflow: nonNegativeMoney,
});

export const financeProjectSnapshotSchema = z.object({
  schemaVersion: z.literal(FINANCE_CONTRACT_VERSION),
  generatedAt: isoDate,
  currency: z.string().regex(/^[A-Z]{3}$/),
  source: z.object({
    system: z.literal("buildfin"),
    projectId: shortText,
    projectCode: shortText,
    projectName: shortText,
  }),
  contract: z.object({
    originalValue: nonNegativeMoney,
    approvedChangeOrders: money,
    revisedValue: nonNegativeMoney,
  }),
  budget: z.object({
    original: nonNegativeMoney,
    revised: nonNegativeMoney,
    committed: nonNegativeMoney,
    actual: nonNegativeMoney,
    remaining: money,
    forecastAtCompletion: nonNegativeMoney,
    variance: money,
    utilizationPercent: percent,
    progressPercent: z.number().min(0).max(100),
    health: z.enum(["healthy", "at_risk", "over_budget", "critical"]),
  }),
  billing: z.object({
    invoiced: nonNegativeMoney,
    collected: nonNegativeMoney,
    outstanding: money,
    overdueInvoices: z.number().int().nonnegative(),
    retentionHeld: nonNegativeMoney,
  }),
  profitability: z.object({
    revenue: money,
    cost: money,
    grossProfit: money,
    grossMarginPercent: percent,
    forecastMarginPercent: percent,
  }),
  categories: z.array(financeCategoryLineSchema).max(50),
  changeOrders: z.array(financeChangeOrderSchema).max(500),
  cashFlow: z.array(financeCashFlowPointSchema).max(60),
});

export type FinanceCategoryLine = z.infer<typeof financeCategoryLineSchema>;
export type FinanceChangeOrder = z.infer<typeof financeChangeOrderSchema>;
export type FinanceCashFlowPoint = z.infer<typeof financeCashFlowPointSchema>;
export type FinanceProjectSnapshot = z.infer<typeof financeProjectSnapshotSchema>;

/** Minimal project listing Report Builder exposes so Finance can link projects. */
export const reportProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  projectCode: z.string(),
  status: z.string(),
  financeProjectId: z.string().nullable(),
  financeSyncedAt: z.string().nullable(),
});

export type ReportProjectSummary = z.infer<typeof reportProjectSummarySchema>;

/** Request body for PUT /api/integration/v1/projects/:id/financials. */
export const pushFinancialsRequestSchema = z.object({
  snapshot: financeProjectSnapshotSchema,
});

export type PushFinancialsRequest = z.infer<typeof pushFinancialsRequestSchema>;

/**
 * Project master data Finance sends when a contractor creates the project in
 * Finance first ("enter once"). Report Builder creates the field project,
 * client and builder records from it, so nothing is typed twice.
 */
const optionalText = z.string().max(500).optional();

export const financeProjectMasterSchema = z.object({
  id: shortText,
  code: shortText,
  name: shortText,
  description: z.string().max(5000),
  type: shortText,
  status: z.enum(["planning", "active", "on_hold", "completed", "closed", "cancelled"]),
  address: z.object({
    line1: shortText,
    line2: optionalText,
    city: shortText,
    state: shortText,
    postalCode: shortText,
    country: shortText,
  }),
  startDate: isoDate,
  targetEndDate: isoDate,
  actualEndDate: isoDate.optional(),
  progressPercent: z.number().min(0).max(100),
  client: z
    .object({
      id: shortText,
      name: shortText,
      companyName: shortText,
      type: z.enum(["individual", "corporate", "government"]),
      email: optionalText,
      phone: optionalText,
      address: optionalText,
      state: optionalText,
      gstNumber: optionalText,
    })
    .nullable(),
});

/** The contractor's own company (Finance settings), used as the report "builder". */
export const financeCompanyProfileSchema = z.object({
  name: shortText,
  legalName: shortText,
  email: optionalText,
  phone: optionalText,
  address: optionalText,
  gstNumber: optionalText,
  panNumber: optionalText,
});

/** Request body for POST /api/integration/v1/projects (create from Finance). */
export const createProjectFromFinanceRequestSchema = z.object({
  project: financeProjectMasterSchema,
  company: financeCompanyProfileSchema,
  snapshot: financeProjectSnapshotSchema,
});

export type FinanceProjectMaster = z.infer<typeof financeProjectMasterSchema>;
export type FinanceCompanyProfile = z.infer<typeof financeCompanyProfileSchema>;
export type CreateProjectFromFinanceRequest = z.infer<typeof createProjectFromFinanceRequestSchema>;

/** Report Builder routes Finance can deep-link to. */
export const REPORT_BUILDER_ROUTES = {
  project: (reportProjectId: string) => `/projects/${encodeURIComponent(reportProjectId)}`,
  generateReport: (reportProjectId: string) =>
    `/reports/generate?projectId=${encodeURIComponent(reportProjectId)}`,
} as const;

/** Finance routes Report Builder can deep-link to. */
export const FINANCE_ROUTES = {
  projectBudget: (financeProjectId: string) =>
    `/projects-budget?project=${encodeURIComponent(financeProjectId)}`,
  profitability: () => `/project-profitability`,
} as const;
