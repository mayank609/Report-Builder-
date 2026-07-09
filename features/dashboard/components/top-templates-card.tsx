import Link from "next/link";
import { LayoutTemplate, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { titleCase } from "@/lib/utils";
import type { ReportTemplate } from "@/types";

export function TopTemplatesCard({ templates }: { templates: ReportTemplate[] }) {
  return (
    <Card className="py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center justify-between text-base">
          Top Templates
          <Link
            href="/templates"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowUpRight className="size-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        {templates.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No templates yet"
            description="Create a template to start generating reports."
            className="py-8"
          />
        ) : (
          <ul className="divide-y">
            {templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={`/templates/${template.id}/edit`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/50 -mx-2 px-2 rounded-md"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {template.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {titleCase(template.reportType)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {template.usageCount} uses
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
