import Link from "next/link";
import { Receipt, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";

const STATUS_VARIANT: Record<InvoiceStatus, "success" | "secondary" | "warning" | "destructive"> = {
  paid: "success",
  draft: "secondary",
  sent: "warning",
  overdue: "destructive",
  cancelled: "secondary",
};

export function RecentInvoicesCard({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card className="py-5">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center justify-between text-base">
          Recent Invoices
          <Link
            href="/invoices"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowUpRight className="size-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No invoices yet"
            description="Create your first invoice to see it here."
            className="py-8"
          />
        ) : (
          <ul className="divide-y">
            {invoices.map((invoice) => (
              <li key={invoice.id}>
                <Link
                  href={`/invoices/${invoice.id}/preview`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-accent/50 -mx-2 px-2 rounded-md"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {invoice.invoiceNumber}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {invoice.billTo.companyName} · {formatDate(invoice.issueDate)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[invoice.status]} className="shrink-0 capitalize">
                    {invoice.status}
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
