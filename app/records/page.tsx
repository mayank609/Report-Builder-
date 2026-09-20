"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Plus,
  Search,
  FilePlus2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RecordCard } from "@/features/records/components/record-card";
import { RecordModal } from "@/features/records/components/record-modal";
import { recordService, projectService } from "@/services";
import { RECORD_TYPE_CONFIGS, type ProjectRecord } from "@/types/record";
import type { Project } from "@/types";

export default function RecordsPage() {
  const [records, setRecords] = useState<ProjectRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Selection for Report Generation
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProjectRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<ProjectRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [recList, projList] = await Promise.all([
        recordService.list(),
        projectService.list(),
      ]);
      setRecords(recList);
      setProjects(projList);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedProjectId !== "all" && r.projectId !== selectedProjectId) return false;
      if (selectedType !== "all" && r.type !== selectedType) return false;
      if (selectedStatus !== "all" && r.status !== selectedStatus) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchRef = r.referenceNumber.toLowerCase().includes(q);
        const matchTitle = r.title.toLowerCase().includes(q);
        const matchPerson = r.responsiblePerson?.toLowerCase().includes(q);
        const matchNotes = r.notes?.toLowerCase().includes(q);
        if (!matchRef && !matchTitle && !matchPerson && !matchNotes) return false;
      }
      return true;
    });
  }, [records, selectedProjectId, selectedType, selectedStatus, search]);

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      await recordService.remove(deletingRecord.id);
      toast.success("Record deleted");
      setRecords((prev) => prev.filter((r) => r.id !== deletingRecord.id));
      setSelectedRecordIds((prev) => prev.filter((id) => id !== deletingRecord.id));
    } catch {
      toast.error("Failed to delete record");
    } finally {
      setDeletingRecord(null);
    }
  };

  const toggleSelectRecord = (id: string, selected: boolean) => {
    setSelectedRecordIds((prev) =>
      selected ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const selectAllFiltered = () => {
    if (selectedRecordIds.length === filteredRecords.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(filteredRecords.map((r) => r.id));
    }
  };

  // Metrics
  const openRfis = records.filter((r) => r.type === "rfi" && r.status !== "closed").length;
  const pendingInspections = records.filter(
    (r) => r.type === "inspection" && r.status !== "closed" && r.status !== "approved"
  ).length;
  const hseIncidents = records.filter((r) => r.type === "hse_safety").length;
  const openPunchList = records.filter(
    (r) => r.type === "punch_list" && r.status !== "closed"
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Project Records & Evidence"
        description="Create and track daily site logs, RFIs, inspections, safety notices, materials, and change orders."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedRecordIds.length > 0 && (
              <Button asChild>
                <Link
                  href={`/reports/generate?${
                    selectedProjectId !== "all" ? `projectId=${selectedProjectId}&` : ""
                  }recordIds=${selectedRecordIds.join(",")}`}
                >
                  <FilePlus2 className="size-4" /> Generate Report ({selectedRecordIds.length})
                </Link>
              </Button>
            )}
            <Button
              onClick={() => {
                setEditingRecord(null);
                setModalOpen(true);
              }}
            >
              <Plus className="size-4" /> New Record
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Total Records"
          value={records.length}
          icon={Layers}
          trend={`${filteredRecords.length} shown`}
          trendDirection="neutral"
        />
        <StatCard
          label="Open RFIs"
          value={openRfis}
          icon={HelpCircle}
          trend={openRfis > 0 ? "Awaiting response" : "All answered"}
          trendDirection={openRfis > 0 ? "down" : "up"}
        />
        <StatCard
          label="Pending Inspections"
          value={pendingInspections}
          icon={CheckCircle2}
          trend={pendingInspections > 0 ? "Action required" : "Up to date"}
          trendDirection={pendingInspections > 0 ? "neutral" : "up"}
        />
        <StatCard
          label="HSE / Safety Logs"
          value={hseIncidents}
          icon={AlertCircle}
          trend="Safety observations"
          trendDirection="neutral"
        />
        <StatCard
          label="Punch List Items"
          value={openPunchList}
          icon={ClipboardList}
          trend={openPunchList > 0 ? "Needs snagging" : "All cleared"}
          trendDirection={openPunchList > 0 ? "down" : "up"}
        />
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search reference #, title, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[180px] text-xs">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px] text-xs">
              <SelectValue placeholder="All Record Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Record Types</SelectItem>
              {Object.values(RECORD_TYPE_CONFIGS).map((c) => (
                <SelectItem key={c.type} value={c.type}>
                  [{c.prefix}] {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[140px] text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredRecords.length > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllFiltered} className="text-xs">
            {selectedRecordIds.length === filteredRecords.length
              ? "Deselect All"
              : `Select All (${filteredRecords.length})`}
          </Button>
        )}
      </div>

      {/* Records Listing */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {!loading && error && <ErrorState onRetry={loadData} />}

      {!loading && !error && filteredRecords.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={records.length === 0 ? "No project records yet" : "No matching records"}
          description={
            records.length === 0
              ? "Start logging daily site activities, RFIs, material deliveries, or safety notices."
              : "Try adjusting your filters or search keywords."
          }
          action={
            <Button
              onClick={() => {
                setEditingRecord(null);
                setModalOpen(true);
              }}
            >
              <Plus className="size-4" /> Create First Record
            </Button>
          }
        />
      )}

      {!loading && !error && filteredRecords.length > 0 && (
        <div className="grid gap-3">
          {filteredRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              selectable
              selected={selectedRecordIds.includes(record.id)}
              onSelectChange={(sel) => toggleSelectRecord(record.id, sel)}
              onEdit={(r) => {
                setEditingRecord(r);
                setModalOpen(true);
              }}
              onDelete={(r) => setDeletingRecord(r)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <RecordModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        record={editingRecord}
        defaultProjectId={selectedProjectId !== "all" ? selectedProjectId : undefined}
        projects={projects}
        onSaved={loadData}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deletingRecord !== null}
        onOpenChange={(open) => !open && setDeletingRecord(null)}
        title="Delete Record"
        description={`Are you sure you want to delete ${deletingRecord?.referenceNumber} ("${deletingRecord?.title}")? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
