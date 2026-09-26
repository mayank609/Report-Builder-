import type { FinanceProjectSnapshot } from "@/integration/contract";
import type { Project, ProjectBudgetLine, ProjectChangeOrder } from "@/types";

/** Change orders mirrored from Finance carry this id prefix so they can be replaced on each sync. */
export const FINANCE_CHANGE_ORDER_PREFIX = "fin-";

function humanizeCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Derives the project fields Report Builder's existing sections already read
 * (budget, cost forecast, change orders) from a Finance snapshot. Finance is
 * the system of record for money, so these fields are overwritten; change
 * orders entered manually in Report Builder are kept.
 */
export function projectPatchFromSnapshot(
  project: Pick<Project, "changeOrders">,
  snapshot: FinanceProjectSnapshot,
  syncedAt: string
): Partial<Project> {
  const budgetBreakdown: ProjectBudgetLine[] = snapshot.categories.map((line) => ({
    category: humanizeCategory(line.category),
    allocated: line.allocated,
    spent: line.actual,
  }));

  const manualChangeOrders = (project.changeOrders ?? []).filter(
    (co) => !co.id.startsWith(FINANCE_CHANGE_ORDER_PREFIX)
  );
  const financeChangeOrders: ProjectChangeOrder[] = snapshot.changeOrders.map((co) => ({
    id: `${FINANCE_CHANGE_ORDER_PREFIX}${co.id}`,
    description: co.number ? `${co.number} — ${co.title}` : co.title,
    date: co.date,
    requestedBy: co.requestedBy,
    costImpact: co.costImpact,
    scheduleImpactDays: co.scheduleImpactDays,
    status: co.status,
  }));

  return {
    totalBudget: snapshot.budget.revised,
    spentBudget: snapshot.budget.actual,
    budgetBreakdown,
    changeOrders: [...manualChangeOrders, ...financeChangeOrders],
    finance: {
      financeProjectId: snapshot.source.projectId,
      syncedAt,
      snapshot,
    },
  };
}
