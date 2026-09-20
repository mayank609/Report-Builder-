"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  FileText,
  Receipt,
  FilePlus2,
  Pencil,
  Save,
  Loader2,
  ClipboardList,
  Plus,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RecordCard } from "@/features/records/components/record-card";
import { RecordModal } from "@/features/records/components/record-modal";
import { useAsync } from "@/hooks/use-async";
import {
  projectService,
  clientService,
  reportService,
  invoiceService,
  recordService,
} from "@/services";
import type { ProjectStatus, ProjectRecord } from "@/types";
import { formatDateTime } from "@/lib/utils";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  delayed: "Delayed",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: project, loading, error, refetch } = useAsync(() => projectService.getById(id), [id]);
  const { data: clients } = useAsync(() => clientService.list());
  const { data: reports } = useAsync(() => reportService.list());
  const { data: invoices } = useAsync(() => invoiceService.list());

  // Records state
  const [records, setRecords] = useState<ProjectRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProjectRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<ProjectRecord | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [recordSearch, setRecordSearch] = useState("");
  const [recordTypeFilter, setRecordTypeFilter] = useState("all");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [initialized, setInitialized] = useState(false);

  const loadRecords = async () => {
    setRecordsLoading(true);
    try {
      const recs = await recordService.list({ projectId: id });
      setRecords(recs);
    } catch {
      // ignore
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (project && !initialized) {
    setForm(project as unknown as Record<string, unknown>);
    setInitialized(true);
  }

  const update = (patch: Record<string, unknown>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await projectService.update(id, form);
      toast.success("Project updated");
      setEditing(false);
      refetch();
    } catch {
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    try {
      await recordService.remove(deletingRecord.id);
      toast.success("Record deleted");
      setRecords((prev) => prev.filter((r) => r.id !== deletingRecord.id));
      setSelectedRecordIds((prev) => prev.filter((rid) => rid !== deletingRecord.id));
    } catch {
      toast.error("Failed to delete record");
    } finally {
      setDeletingRecord(null);
    }
  };

  const toggleSelectRecord = (rid: string, selected: boolean) => {
    setSelectedRecordIds((prev) =>
      selected ? [...prev, rid] : prev.filter((item) => item !== rid)
    );
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (recordTypeFilter !== "all" && r.type !== recordTypeFilter) return false;
      if (recordSearch.trim()) {
        const q = recordSearch.toLowerCase();
        return (
          r.referenceNumber.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, recordTypeFilter, recordSearch]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (error || !project) return <ErrorState title="Project not found" onRetry={refetch} />;

  const projectReports = reports?.filter((r) => r.projectId === project.id) ?? [];
  const projectInvoices = invoices?.filter((i) => i.projectId === project.id) ?? [];
  const client = clients?.find((c) => c.id === project.clientId);

  // Pending Actions
  const openRfis = records.filter((r) => r.type === "rfi" && r.status !== "closed").length;
  const pendingInspections = records.filter(
    (r) => r.type === "inspection" && r.status !== "closed" && r.status !== "approved"
  ).length;
  const hseIncidents = records.filter((r) => r.type === "hse_safety").length;
  const openPunchList = records.filter(
    (r) => r.type === "punch_list" && r.status !== "closed"
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/projects"
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Projects
          </Link>
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.projectCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setForm(project as unknown as Record<string, unknown>);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
          <Button asChild>
            <Link
              href={`/reports/generate?projectId=${project.id}${
                selectedRecordIds.length > 0 ? `&recordIds=${selectedRecordIds.join(",")}` : ""
              }`}
            >
              <FilePlus2 className="size-4" /> Generate Report
              {selectedRecordIds.length > 0 ? ` (${selectedRecordIds.length} records)` : ""}
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-5">
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="secondary" className="mt-1">
              {STATUS_LABELS[project.status]}
            </Badge>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="space-y-1 px-4">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-lg font-semibold">{project.percentComplete}%</p>
            <Progress value={project.percentComplete} className="h-1.5" />
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Records &amp; Evidence</p>
            <p className="mt-1 text-lg font-semibold">{records.length}</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Reports</p>
            <p className="mt-1 text-lg font-semibold">{projectReports.length}</p>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Invoices</p>
            <p className="mt-1 text-lg font-semibold">{projectInvoices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions Alert Box if any items need attention */}
      {(openRfis > 0 || pendingInspections > 0 || hseIncidents > 0 || openPunchList > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-foreground">
          <span className="font-semibold text-amber-600 dark:text-amber-400">Action Items:</span>
          {openRfis > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
              <HelpCircle className="size-3" /> {openRfis} Open RFI{openRfis > 1 ? "s" : ""}
            </span>
          )}
          {pendingInspections > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-300">
              <CheckCircle2 className="size-3" /> {pendingInspections} Pending Inspection
              {pendingInspections > 1 ? "s" : ""}
            </span>
          )}
          {hseIncidents > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 font-medium text-red-700 dark:text-red-300">
              <AlertCircle className="size-3" /> {hseIncidents} Safety Incident
              {hseIncidents > 1 ? "s" : ""}
            </span>
          )}
          {openPunchList > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 font-medium text-purple-700 dark:text-purple-300">
              <ClipboardList className="size-3" /> {openPunchList} Punch List Item
              {openPunchList > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Records &amp; Evidence ({records.length})</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="reports">Reports ({projectReports.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({projectInvoices.length})</TabsTrigger>
        </TabsList>

        {/* Records & Evidence Tab */}
        <TabsContent value="records" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Input
                placeholder="Search records..."
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                className="max-w-xs text-xs"
              />
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger className="w-[180px] text-xs">
                  <SelectValue placeholder="All Record Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="daily_site">[DSR] Daily Site Log</SelectItem>
                  <SelectItem value="rfi">[RFI] RFI</SelectItem>
                  <SelectItem value="inspection">[INSP] Inspection</SelectItem>
                  <SelectItem value="hse_safety">[HSE] Safety Incident</SelectItem>
                  <SelectItem value="material">[MAT] Materials</SelectItem>
                  <SelectItem value="labour">[LAB] Labour</SelectItem>
                  <SelectItem value="equipment">[EQP] Equipment</SelectItem>
                  <SelectItem value="change_order">[CO] Change Order</SelectItem>
                  <SelectItem value="punch_list">[PL] Punch List</SelectItem>
                  <SelectItem value="site_instruction">[SI] Site Instruction</SelectItem>
                  <SelectItem value="meeting">[MTG] Meeting</SelectItem>
                  <SelectItem value="permit">[PRM] Permit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {selectedRecordIds.length > 0 && (
                <Button size="sm" asChild>
                  <Link
                    href={`/reports/generate?projectId=${project.id}&recordIds=${selectedRecordIds.join(
                      ","
                    )}`}
                  >
                    <FilePlus2 className="size-3.5" /> Generate Report ({selectedRecordIds.length})
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setEditingRecord(null);
                  setRecordModalOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Add Record
              </Button>
            </div>
          </div>

          {recordsLoading && (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {!recordsLoading && filteredRecords.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title={records.length === 0 ? "No records logged yet" : "No matching records"}
              description={
                records.length === 0
                  ? "Log daily site records, RFIs, inspections, or safety notes to feed AI report generation."
                  : "Try clearing your search query or type filter."
              }
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingRecord(null);
                    setRecordModalOpen(true);
                  }}
                >
                  <Plus className="size-3.5" /> Add First Record
                </Button>
              }
            />
          )}

          {!recordsLoading && filteredRecords.length > 0 && (
            <div className="space-y-2.5">
              {filteredRecords.map((rec) => (
                <RecordCard
                  key={rec.id}
                  record={rec}
                  selectable
                  selected={selectedRecordIds.includes(rec.id)}
                  onSelectChange={(sel) => toggleSelectRecord(rec.id, sel)}
                  onEdit={(r) => {
                    setEditingRecord(r);
                    setRecordModalOpen(true);
                  }}
                  onDelete={(r) => setDeletingRecord(r)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="mt-4 space-y-4">
          <Card className="py-5">
            <CardHeader className="px-5">
              <CardTitle className="text-base">Project Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5">
              {editing ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Project Name</Label>
                      <Input
                        value={(form.name as string) || ""}
                        onChange={(e) => update({ name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select
                        value={(form.status as string) || "planning"}
                        onValueChange={(v) => update({ status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="delayed">Delayed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={(form.description as string) || ""}
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input
                        value={(form.city as string) || ""}
                        onChange={(e) => update({ city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>State</Label>
                      <Input
                        value={(form.state as string) || ""}
                        onChange={(e) => update({ state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Progress (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={(form.percentComplete as number) ?? 0}
                        onChange={(e) => update({ percentComplete: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="mt-1 text-sm">{project.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="mt-1 flex items-center gap-1 text-sm">
                      <MapPin className="size-3.5" /> {project.address ? `${project.address}, ` : ""}
                      {project.city || ""}
                      {project.state ? `, ${project.state}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Schedule</p>
                    <p className="mt-1 flex items-center gap-1 text-sm">
                      <Calendar className="size-3.5" /> {project.startDate || "TBD"} →{" "}
                      {project.estimatedEndDate || "TBD"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="mt-1 text-sm">{client?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="mt-1 text-sm">
                      ₹{(project.totalBudget ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Site Area</p>
                    <p className="mt-1 text-sm">
                      {project.siteAreaSqft
                        ? `${project.siteAreaSqft.toLocaleString()} sq.ft.`
                        : "—"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          {projectReports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No reports for this project"
              description="Generate a report from this project's records and data."
              action={
                <Button asChild>
                  <Link href={`/reports/generate?projectId=${project.id}`}>
                    <FilePlus2 className="size-4" /> Generate Report
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {projectReports.map((r) => (
                <Card
                  key={r.id}
                  className="cursor-pointer py-3 transition-shadow hover:shadow-sm"
                  onClick={() => router.push(`/reports/${r.id}/preview`)}
                >
                  <CardContent className="flex items-center justify-between px-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{r.name}</p>
                        {r.version && (
                          <Badge variant="outline" className="text-[10px]">
                            v{r.version}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.reportNumber} · {formatDateTime(r.createdAt)}
                        {r.sourceRecordIds && r.sourceRecordIds.length > 0 && (
                          <span className="ml-2">
                            · {r.sourceRecordIds.length} evidence record(s)
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge
                      variant={
                        r.status === "final" || r.status === "approved"
                          ? "success"
                          : r.status === "signed"
                          ? "default"
                          : "outline"
                      }
                      className="text-[10px] capitalize"
                    >
                      {r.status.replace("_", " ")}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          {projectInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices for this project"
              description="Create an invoice for this project."
              action={
                <Button asChild>
                  <Link href={`/invoices/new?projectId=${project.id}`}>
                    <Receipt className="size-4" /> Create Invoice
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {projectInvoices.map((inv) => (
                <Card
                  key={inv.id}
                  className="cursor-pointer py-3 transition-shadow hover:shadow-sm"
                  onClick={() => router.push(`/invoices/${inv.id}/preview`)}
                >
                  <CardContent className="flex items-center justify-between px-5">
                    <div>
                      <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{inv.totals.grandTotal.toLocaleString("en-IN")} ·{" "}
                        {formatDateTime(inv.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={inv.status === "paid" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {inv.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Record Create/Edit Modal */}
      <RecordModal
        open={recordModalOpen}
        onOpenChange={setRecordModalOpen}
        record={editingRecord}
        defaultProjectId={project.id}
        projects={[project]}
        onSaved={loadRecords}
      />

      {/* Delete Record Confirmation Dialog */}
      <ConfirmDialog
        open={deletingRecord !== null}
        onOpenChange={(op) => !op && setDeletingRecord(null)}
        title="Delete Record"
        description={`Are you sure you want to delete ${deletingRecord?.referenceNumber} ("${deletingRecord?.title}")?`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteRecord}
      />
    </div>
  );
}
