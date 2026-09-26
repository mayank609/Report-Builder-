"use client";

import { useEffect, useState } from "react";
import { Eye, History, Landmark, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { reportVersionService } from "@/services";
import { formatDateTime } from "@/lib/utils";
import type { ReportVersionSnapshot, ReportVersionSummary } from "@/lib/report-versions";
import type { GeneratedReport, ReportVersionEntry } from "@/types";

interface ReportVersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: GeneratedReport;
  /** Show an archived version read-only in the main viewer. */
  onView: (snapshot: ReportVersionSnapshot) => void;
  onRestored: () => void;
}

/**
 * Every version of the report: the live one plus each archived snapshot.
 * Archived versions can be opened read-only or restored (as a new version —
 * history is never rewritten).
 */
export function ReportVersionHistoryDialog({
  open,
  onOpenChange,
  report,
  onView,
  onRestored,
}: ReportVersionHistoryDialogProps) {
  const [versions, setVersions] = useState<ReportVersionSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const currentVersion = report.version || 1;

  useEffect(() => {
    if (!open) return;
    setVersions(null);
    reportVersionService
      .list(report.id)
      .then(setVersions)
      .catch(() => setVersions([]));
  }, [open, report.id, report.version]);

  const history: ReportVersionEntry[] = report.versionHistory?.length
    ? report.versionHistory
    : [{ version: 1, date: report.createdAt, action: "Report created", actor: "System" }];
  const eventsFor = (version: number) => history.filter((e) => e.version === version);

  const allVersions = Array.from(
    new Set([currentVersion, ...history.map((e) => e.version), ...(versions ?? []).map((v) => v.version)])
  ).sort((a, b) => b - a);

  const handleView = async (version: number) => {
    setBusy(`view-${version}`);
    try {
      onView(await reportVersionService.get(report.id, version));
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (version: number) => {
    setBusy(`restore-${version}`);
    try {
      const restored = await reportVersionService.restore(report.id, version);
      toast.success(`Restored v${version} as v${restored.version}. Re-approval required.`);
      onRestored();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" /> Version History
          </DialogTitle>
          <DialogDescription>
            Every revision is kept in full. Open any earlier version read-only, or restore it as a
            new version.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {versions === null && (
            <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Loading versions…
            </div>
          )}
          {versions !== null &&
            allVersions.map((version) => {
              const archived = versions.find((v) => v.version === version);
              const isCurrent = version === currentVersion;
              const events = eventsFor(version);
              return (
                <div key={version} className="rounded-lg border p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">v{version}</span>
                      {isCurrent && <Badge variant="secondary">Current</Badge>}
                      {archived && (
                        <span className="text-muted-foreground">
                          {archived.sectionCount} sections
                          {archived.signatureCount ? ` · ${archived.signatureCount} signed` : ""}
                        </span>
                      )}
                    </div>
                    {archived && !isCurrent && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={busy !== null}
                          onClick={() => handleView(version)}
                        >
                          {busy === `view-${version}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Eye className="size-3" />
                          )}
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          disabled={busy !== null}
                          onClick={() => handleRestore(version)}
                        >
                          {busy === `restore-${version}` ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3" />
                          )}
                          Restore
                        </Button>
                      </div>
                    )}
                  </div>
                  <ul className="mt-2 space-y-1 border-l-2 border-primary/30 pl-3">
                    {events.map((entry, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-foreground">{entry.action}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {entry.actor} · {formatDateTime(entry.date)}
                        </span>
                        {entry.summary && (
                          <p className="text-[11px] italic text-muted-foreground">{entry.summary}</p>
                        )}
                      </li>
                    ))}
                    {events.length === 0 && archived && (
                      <li className="text-muted-foreground">
                        {archived.action} · archived {formatDateTime(archived.capturedAt)}
                      </li>
                    )}
                  </ul>
                  {archived?.financeSyncedAt && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Landmark className="size-3" /> Financial figures as synced{" "}
                      {formatDateTime(archived.financeSyncedAt)}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
