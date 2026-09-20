"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Paperclip, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { recordService } from "@/services";
import {
  type ProjectRecord,
  type ProjectRecordType,
  type RecordPriority,
  type RecordStatus,
  type RecordAttachment,
  RECORD_TYPE_CONFIGS,
} from "@/types/record";
import type { Project } from "@/types";

interface RecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ProjectRecord | null;
  defaultProjectId?: string;
  defaultType?: ProjectRecordType;
  projects: Project[];
  onSaved: () => void;
}

export function RecordModal({
  open,
  onOpenChange,
  record,
  defaultProjectId,
  defaultType = "daily_site",
  projects,
  onSaved,
}: RecordModalProps) {
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [type, setType] = useState<ProjectRecordType>(defaultType);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<RecordStatus>("open");
  const [priority, setPriority] = useState<RecordPriority>("medium");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [notes, setNotes] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachments, setAttachments] = useState<RecordAttachment[]>([]);
  const [extraField1, setExtraField1] = useState(""); // Weather / Cost Impact / Area / Trade
  const [extraField2, setExtraField2] = useState(""); // Work Completed / Result / Severity
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setProjectId(record.projectId);
      setType(record.type);
      setTitle(record.title);
      setDate(record.date);
      setStatus(record.status);
      setPriority(record.priority);
      setResponsiblePerson(record.responsiblePerson || "");
      setNotes(record.notes || "");
      setAttachments(record.attachments || []);
      setExtraField1(record.data?.field1 || "");
      setExtraField2(record.data?.field2 || "");
    } else {
      setProjectId(defaultProjectId || (projects[0]?.id ?? ""));
      setType(defaultType);
      setTitle("");
      setDate(new Date().toISOString().slice(0, 10));
      setStatus("open");
      setPriority("medium");
      setResponsiblePerson("");
      setNotes("");
      setAttachments([]);
      setExtraField1("");
      setExtraField2("");
    }
  }, [record, defaultProjectId, defaultType, projects, open]);

  const addAttachment = () => {
    if (!attachmentUrl.trim()) return;
    const newAtt: RecordAttachment = {
      id: "att_" + Math.random().toString(36).slice(2, 9),
      name: attachmentName.trim() || "Attachment " + (attachments.length + 1),
      url: attachmentUrl.trim(),
    };
    setAttachments([...attachments, newAtt]);
    setAttachmentUrl("");
    setAttachmentName("");
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSave = async () => {
    if (!projectId) {
      toast.error("Please select a project");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a record title or summary");
      return;
    }

    setSaving(true);
    try {
      const selectedProject = projects.find((p) => p.id === projectId);
      const dataPayload = {
        field1: extraField1.trim(),
        field2: extraField2.trim(),
      };

      if (record) {
        await recordService.update(record.id, {
          projectId,
          projectName: selectedProject?.name,
          type,
          title: title.trim(),
          date,
          status,
          priority,
          responsiblePerson: responsiblePerson.trim(),
          notes: notes.trim(),
          attachments,
          data: dataPayload,
        });
        toast.success("Record updated");
      } else {
        await recordService.create({
          projectId,
          projectName: selectedProject?.name,
          type,
          title: title.trim(),
          date,
          status,
          priority,
          responsiblePerson: responsiblePerson.trim(),
          notes: notes.trim(),
          attachments,
          data: dataPayload,
        });
        toast.success("Record created");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = RECORD_TYPE_CONFIGS[type];

  // Tailor extra labels based on record type
  let label1 = "Specific Detail / Category";
  let label2 = "Resolution / Action Taken";
  if (type === "daily_site") {
    label1 = "Weather & Site Conditions";
    label2 = "Work Executed / Crew Count";
  } else if (type === "rfi") {
    label1 = "Specification / Drawing Reference";
    label2 = "Official Engineering Response";
  } else if (type === "inspection") {
    label1 = "Inspection Area / Component";
    label2 = "Inspection Outcome (Pass / Fail / Conditional)";
  } else if (type === "hse_safety") {
    label1 = "Incident Severity / Hazard Classification";
    label2 = "Corrective & Preventive Action";
  } else if (type === "material") {
    label1 = "Quantity, Unit & Supplier";
    label2 = "Batch No / Test Certificate Ref";
  } else if (type === "change_order") {
    label1 = "Estimated Cost Impact";
    label2 = "Schedule Impact / Time Extension";
  } else if (type === "punch_list") {
    label1 = "Area & Trade Responsible";
    label2 = "Rectification Status / Target Date";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {record ? `Edit Record (${record.referenceNumber})` : "Create Project Record"}
          </DialogTitle>
          <DialogDescription>
            Log site observations, quality audits, RFIs, safety items, and materials for evidence-based reporting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Project & Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Record Type *</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectRecordType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RECORD_TYPE_CONFIGS).map((cfg) => (
                    <SelectItem key={cfg.type} value={cfg.type}>
                      <span className="font-mono text-xs opacity-70">[{cfg.prefix}]</span>{" "}
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title / Subject *</Label>
            <Input
              placeholder={`e.g. ${typeConfig.label} - Floor 3 slab casting`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Date, Status, Priority */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as RecordStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as RecordPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsible Person */}
          <div className="space-y-1.5">
            <Label>Responsible Person / Inspector / Engineer</Label>
            <Input
              placeholder="e.g. Er. Rajiv Verma (Quality Head)"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
            />
          </div>

          {/* Tailored Extra Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{label1}</Label>
              <Input
                placeholder="Optional specific data"
                value={extraField1}
                onChange={(e) => setExtraField1(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{label2}</Label>
              <Input
                placeholder="Optional details"
                value={extraField2}
                onChange={(e) => setExtraField2(e.target.value)}
              />
            </div>
          </div>

          {/* Detailed Notes */}
          <div className="space-y-1.5">
            <Label>Detailed Notes &amp; Observations</Label>
            <Textarea
              rows={3}
              placeholder="Enter factual observations, findings, instructions, or resolution notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Attachments / Photos */}
          <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Paperclip className="size-3.5" /> Attachments &amp; Site Photos
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Name / caption (e.g. Rebar inspection photo)"
                value={attachmentName}
                onChange={(e) => setAttachmentName(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="URL (e.g. https://... or /uploads/...)"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="text-xs"
              />
              <Button type="button" size="sm" variant="outline" onClick={addAttachment}>
                <Plus className="size-3.5" /> Add
              </Button>
            </div>

            {attachments.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between rounded border bg-background px-2.5 py-1 text-xs"
                  >
                    <span className="truncate font-medium">{att.name}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Link
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive"
                        onClick={() => removeAttachment(att.id)}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {record ? "Save Changes" : "Create Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
