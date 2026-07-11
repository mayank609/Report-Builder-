"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Receipt, Eye, Trash2, IndianRupee, FileWarning, FileClock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvoices } from "@/features/invoices/hooks/use-invoices";
import { InvoiceDownloadMenu } from "@/features/invoices/components/invoice-download-menu";
import { useAsync } from "@/hooks/use-async";
import { builderService, invoiceService } from "@/services";
import { formatDate } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

const STATUS_VARIANT: Record<InvoiceStatus, "success" | "secondary" | "warning" | "destructive"> = {
  paid: "success",
  draft: "secondary",
  sent: "warning",
  overdue: "destructive",
  cancelled: "secondary",
};

export default function InvoicesPage() {
  const { invoices, loading, error, refetch, remove } = useInvoices();
  const { data: builders } = useAsync(() => builderService.list());
  const { data: stats } = useAsync(() => invoiceService.stats());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [builderFilter, setBuilderFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const builderLabel = useMemo(() => {
    const map = new Map<string, string>();
    (builders ?? []).forEach((b) => map.set(b.id, b.companyName));
    return map;
  }, [builders]);

  const clientOptions = useMemo(
    () => Array.from(new Set(invoices.map((i) => i.billTo.companyName))).sort(),
    [invoices]
  );

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.billTo.companyName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchesBuilder = builderFilter === "all" || inv.builderId === builderFilter;
      const matchesClient = clientFilter === "all" || inv.billTo.companyName === clientFilter;
      const matchesFrom = !dateFrom || inv.issueDate >= dateFrom;
      const matchesTo = !dateTo || inv.issueDate <= dateTo;
      return matchesSearch && matchesStatus && matchesBuilder && matchesClient && matchesFrom && matchesTo;
    });
  }, [invoices, search, statusFilter, builderFilter, clientFilter, dateFrom, dateTo]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Invoices"
        description="Create GST-compliant invoices with automatic CGST/SGST/IGST calculation."
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus className="size-4" /> New Invoice
            </Link>
          </Button>
        }
      />

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Invoices" value={stats.total} icon={Receipt} />
          <StatCard
            label="Outstanding"
            value={new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(stats.outstanding)}
            icon={IndianRupee}
          />
          <StatCard
            label="Overdue"
            value={stats.overdueCount}
            icon={stats.overdueCount > 0 ? FileWarning : FileClock}
            trend={stats.overdueCount > 0 ? "Needs follow-up" : "All clear"}
            trendDirection={stats.overdueCount > 0 ? "down" : "up"}
          />
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice # or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={builderFilter} onValueChange={setBuilderFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Builder / GSTIN" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All builders</SelectItem>
                {(builders ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clientOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
              aria-label="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
              aria-label="To date"
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState onRetry={refetch} />}

      {!loading && !error && invoices.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Create your first GST-compliant invoice."
          action={
            <Button asChild>
              <Link href="/invoices/new">
                <Plus className="size-4" /> New Invoice
              </Link>
            </Button>
          }
        />
      )}

      {!loading && !error && invoices.length > 0 && filtered.length === 0 && (
        <EmptyState icon={Search} title="No matching invoices" description="Try adjusting your filters." />
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Builder</th>
                  <th className="px-4 py-3 font-medium">Bill To</th>
                  <th className="px-4 py-3 font-medium">Issue Date</th>
                  <th className="px-4 py-3 font-medium">Due Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-accent/40">
                    <td className="px-4 py-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {builderLabel.get(inv.builderId) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.billTo.companyName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.issueDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: inv.currency || "INR",
                        maximumFractionDigits: 0,
                      }).format(inv.totals.grandTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[inv.status]} className="capitalize">
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <Link href={`/invoices/${inv.id}/preview`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <InvoiceDownloadMenu invoiceId={inv.id} variant="icon" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setPendingDeleteId(inv.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete invoice?"
        description="This will permanently remove the invoice."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (pendingDeleteId) await remove(pendingDeleteId);
        }}
      />
    </div>
  );
}
