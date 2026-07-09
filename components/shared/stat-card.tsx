import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = "neutral",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-3 py-5", className)}>
      <CardContent className="flex items-start justify-between px-5">
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trendDirection === "up" && "text-success",
                trendDirection === "down" && "text-destructive",
                trendDirection === "neutral" && "text-muted-foreground"
              )}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
