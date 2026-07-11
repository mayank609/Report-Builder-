"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Star, Check, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { builderService } from "@/services";
import { generateId } from "@/lib/utils";
import { isValidGstin, stateCodeFromGstin, stateNameFromCode } from "@/lib/gst/india-states";
import type { Builder, GstBranch } from "@/types";

interface GstBranchManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder: Builder | null;
  onSaved: (branches: GstBranch[]) => void;
}

function emptyDraft(): Omit<GstBranch, "id" | "stateCode" | "state"> {
  return { label: "", gstin: "", address: "", isDefault: false };
}

export function GstBranchManagerDialog({
  open,
  onOpenChange,
  builder,
  onSaved,
}: GstBranchManagerDialogProps) {
  const [branches, setBranches] = useState<GstBranch[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBranches(builder?.gstBranches ?? []);
      setEditingId(null);
      setDraft(emptyDraft());
    }
  }, [open, builder]);

  const gstinValid = isValidGstin(draft.gstin);
  const stateCode = gstinValid ? stateCodeFromGstin(draft.gstin) : null;
  const stateName = stateCode ? stateNameFromCode(stateCode) : null;

  const startEdit = (branch: GstBranch) => {
    setEditingId(branch.id);
    setDraft({
      label: branch.label,
      gstin: branch.gstin,
      address: branch.address,
      isDefault: branch.isDefault,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const commitDraft = () => {
    if (!draft.label.trim()) {
      toast.error("Give this GST branch a label");
      return;
    }
    if (!gstinValid || !stateCode || !stateName) {
      toast.error("Enter a valid 15-character GSTIN");
      return;
    }

    const nextBranch: GstBranch = {
      id: editingId ?? generateId("gst"),
      label: draft.label.trim(),
      gstin: draft.gstin.trim().toUpperCase(),
      stateCode,
      state: stateName,
      address: draft.address.trim(),
      isDefault: draft.isDefault,
    };

    setBranches((prev) => {
      const withoutCurrent = prev.filter((b) => b.id !== nextBranch.id);
      const cleared = nextBranch.isDefault
        ? withoutCurrent.map((b) => ({ ...b, isDefault: false }))
        : withoutCurrent;
      return [...cleared, nextBranch];
    });
    cancelEdit();
  };

  const removeBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    if (editingId === id) cancelEdit();
  };

  const handleSave = async () => {
    if (!builder) return;
    setSaving(true);
    try {
      const updated = await builderService.update(builder.id, { gstBranches: branches });
      toast.success("GST branches updated");
      onSaved(updated.gstBranches);
      onOpenChange(false);
    } catch {
      toast.error("Failed to save GST branches");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>GST Branches — {builder?.companyName}</DialogTitle>
          <DialogDescription>
            Add every GSTIN this business is registered under. The correct branch is auto-selected
            per invoice by matching the client&apos;s state.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {branches.length === 0 && (
            <p className="text-sm text-muted-foreground">No GST branches added yet.</p>
          )}
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="flex items-start justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-foreground">{branch.label}</p>
                  {branch.isDefault && (
                    <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                      <Star className="size-3" /> Default
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {branch.gstin} · {branch.state}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" className="size-7" onClick={() => startEdit(branch)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  onClick={() => removeBranch(branch.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-md border border-dashed p-3">
          <p className="text-xs font-medium text-foreground">
            {editingId ? "Edit GST Branch" : "Add GST Branch"}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="branch-label">Label</Label>
              <Input
                id="branch-label"
                placeholder="e.g. Head Office – Maharashtra"
                value={draft.label}
                onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="branch-gstin">GSTIN</Label>
              <Input
                id="branch-gstin"
                placeholder="27ABCDE1234F1Z5"
                className="uppercase"
                value={draft.gstin}
                onChange={(e) => setDraft((d) => ({ ...d, gstin: e.target.value.toUpperCase() }))}
              />
              {draft.gstin && (
                <p className={`text-[11px] ${gstinValid ? "text-emerald-600" : "text-destructive"}`}>
                  {gstinValid ? `Valid — ${stateName}` : "Invalid GSTIN format"}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="branch-address">Registered Address</Label>
            <Input
              id="branch-address"
              placeholder="Office address for this GSTIN"
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="branch-default" className="text-sm">
              Default branch
            </Label>
            <Switch
              id="branch-default"
              checked={draft.isDefault}
              onCheckedChange={(checked) => setDraft((d) => ({ ...d, isDefault: checked }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            {editingId && (
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="size-3.5" /> Cancel
              </Button>
            )}
            <Button type="button" size="sm" onClick={commitDraft}>
              {editingId ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
              {editingId ? "Update Branch" : "Add Branch"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
