"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { PenLine } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignaturePad, type SignaturePadHandle } from "@/components/shared/signature-pad";
import { generateId } from "@/lib/utils";
import { reportService } from "@/services";
import type { GeneratedReport } from "@/types";

const ROLE_OPTIONS = ["Prepared By", "Reviewed By", "Approved By", "Inspected By"];

interface ReportSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: GeneratedReport;
  onSigned: () => void;
}

export function ReportSignatureDialog({
  open,
  onOpenChange,
  report,
  onSigned,
}: ReportSignatureDialogProps) {
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [signerName, setSignerName] = useState("");
  const [saving, setSaving] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  const handleSave = async () => {
    if (!signerName.trim()) {
      toast.error("Enter the signer's name");
      return;
    }
    const dataUrl = padRef.current?.getDataUrl();
    if (!dataUrl) {
      toast.error("Draw or type a signature before saving");
      return;
    }
    setSaving(true);
    try {
      const signature = {
        id: generateId("sig"),
        role,
        signerName: signerName.trim(),
        imageDataUrl: dataUrl,
        signedAt: new Date().toISOString(),
      };
      await reportService.update(report.id, {
        signatures: [...report.signatures.filter((s) => s.role !== role), signature],
      });
      toast.success("Signature added to report");
      onSigned();
      onOpenChange(false);
      setSignerName("");
      padRef.current?.clear();
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="size-4" /> Sign Report
          </DialogTitle>
          <DialogDescription>
            Draw or type a signature. It replaces the blank sign-off line and is embedded
            directly in the preview and PDF export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signerName">Full Name</Label>
              <Input
                id="signerName"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Signature</Label>
            <SignaturePad ref={padRef} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
