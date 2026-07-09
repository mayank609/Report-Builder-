"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { reportService } from "@/services";
import type { GeneratedReport, ReportSectionContent } from "@/types";

interface ReportEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: GeneratedReport;
  onSaved: () => void;
}

export function ReportEditSheet({ open, onOpenChange, report, onSaved }: ReportEditSheetProps) {
  const [name, setName] = useState(report.name);
  const [sections, setSections] = useState<ReportSectionContent[]>(report.sections);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(report.name);
      setSections(report.sections);
    }
  }, [open, report]);

  const updateSection = (sectionId: string, patch: Partial<ReportSectionContent>) => {
    setSections((prev) => prev.map((s) => (s.sectionId === sectionId ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await reportService.update(report.id, { name, sections });
      toast.success("Report updated");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update report");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle>Edit Report</SheetTitle>
          <SheetDescription>
            Update the report name and section content. Changes apply immediately to the preview
            and PDF export.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-name">Report Name</Label>
              <Input id="report-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Separator />
            {sections.map((section) => (
              <div key={section.sectionId} className="space-y-1.5">
                <Label htmlFor={`section-${section.sectionId}`}>{section.title}</Label>
                <Textarea
                  id={`section-${section.sectionId}`}
                  rows={5}
                  value={section.html}
                  onChange={(e) => updateSection(section.sectionId, { html: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <SheetFooter className="border-t">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
