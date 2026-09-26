"use client";

import { ExternalLink, Landmark } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FINANCE_ROUTES } from "@/integration/contract";
import { formatMoneyCompact } from "@/lib/pdf/financial-summary";
import { formatDateTime } from "@/lib/utils";
import type { Project } from "@/types";

const FINANCE_URL = process.env.NEXT_PUBLIC_FINANCE_URL?.replace(/\/$/, "") ?? "";

const HEALTH_VARIANT = {
  healthy: { label: "Healthy", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  at_risk: { label: "At risk", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  over_budget: { label: "Over budget", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  critical: { label: "Critical", className: "bg-red-500/15 text-red-700 dark:text-red-400" },
} as const;

/** Live financials mirrored from the Finance module (read-only here). */
export function ProjectFinanceCard({ project }: { project: Project }) {
  const finance = project.finance;

  if (!finance) {
    return (
      <Card className="py-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-3">
            <Landmark className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Not linked to Finance</p>
              <p className="text-xs text-muted-foreground">
                Sync this project from Finance → Projects &amp; Budget to show live budget, cost and
                billing figures here and in reports.
              </p>
            </div>
          </div>
          {FINANCE_URL && (
            <Button variant="outline" size="sm" asChild>
              <a href={`${FINANCE_URL}/projects-budget`} target="_blank" rel="noopener noreferrer">
                Open Finance <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const { snapshot } = finance;
  const money = (n: number) => formatMoneyCompact(n, snapshot.currency);
  const health = HEALTH_VARIANT[snapshot.budget.health];
  const stats = [
    { label: "Revised contract", value: money(snapshot.contract.revisedValue) },
    { label: "Revised budget", value: money(snapshot.budget.revised) },
    { label: "Actual cost", value: money(snapshot.budget.actual) },
    { label: "Forecast at completion", value: money(snapshot.budget.forecastAtCompletion) },
    { label: "Outstanding AR", value: money(snapshot.billing.outstanding) },
    { label: "Forecast margin", value: `${snapshot.profitability.forecastMarginPercent.toFixed(1)}%` },
  ];

  return (
    <Card className="py-4">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 px-5">
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Financials</CardTitle>
          <Badge variant="secondary" className={health.className}>
            {health.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Synced {formatDateTime(finance.syncedAt)}
          </span>
          {FINANCE_URL && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={`${FINANCE_URL}${FINANCE_ROUTES.projectBudget(finance.financeProjectId)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Finance <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 px-5 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{stat.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
