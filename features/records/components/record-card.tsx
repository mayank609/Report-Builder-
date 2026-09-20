"use client";

import {
  Calendar,
  User,
  Paperclip,
  Pencil,
  Trash2,
  AlertCircle,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RECORD_TYPE_CONFIGS,
  RECORD_STATUS_CONFIG,
  RECORD_PRIORITY_CONFIG,
  type ProjectRecord,
} from "@/types/record";

interface RecordCardProps {
  record: ProjectRecord;
  selectable?: boolean;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  onEdit?: (record: ProjectRecord) => void;
  onDelete?: (record: ProjectRecord) => void;
}

export function RecordCard({
  record,
  selectable = false,
  selected = false,
  onSelectChange,
  onEdit,
  onDelete,
}: RecordCardProps) {
  const typeConfig = RECORD_TYPE_CONFIGS[record.type] || {
    label: record.type,
    prefix: "REC",
    color: "text-foreground",
    bgColor: "bg-muted border-border",
  };

  const statusConfig = RECORD_STATUS_CONFIG[record.status] || {
    label: record.status,
    variant: "outline" as const,
  };

  const priorityConfig = RECORD_PRIORITY_CONFIG[record.priority] || {
    label: record.priority,
    color: "text-muted-foreground",
  };

  return (
    <Card
      className={`transition-all hover:border-primary/40 ${
        selected ? "border-primary bg-primary/[0.02] shadow-sm" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {selectable && (
              <div className="pt-0.5">
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) => onSelectChange?.(Boolean(checked))}
                />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-tight text-primary">
                  {record.referenceNumber}
                </span>
                <span
                  className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${typeConfig.bgColor} ${typeConfig.color}`}
                >
                  {typeConfig.label}
                </span>
                <Badge variant={statusConfig.variant} className="text-[10px]">
                  {statusConfig.label}
                </Badge>
                {record.priority === "urgent" && (
                  <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                    <AlertCircle className="size-3" /> Urgent
                  </span>
                )}
                {record.priority !== "urgent" && (
                  <span className={`text-[11px] ${priorityConfig.color}`}>
                    {priorityConfig.label} Priority
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-foreground">{record.title}</h4>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(record)}
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(record)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {record.notes && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
            {record.notes}
          </p>
        )}

        {(record.data?.field1 || record.data?.field2) && (
          <div className="mt-2.5 flex flex-wrap gap-2 rounded bg-muted/40 p-2 text-xs">
            {record.data?.field1 && (
              <div className="truncate">
                <span className="font-medium text-foreground">{record.data.field1}</span>
              </div>
            )}
            {record.data?.field2 && (
              <div className="truncate border-l pl-2 text-muted-foreground">
                <span>{record.data.field2}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" /> {record.date}
            </span>
            {record.responsiblePerson && (
              <span className="inline-flex items-center gap-1">
                <User className="size-3" /> {record.responsiblePerson}
              </span>
            )}
            {record.projectName && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="size-3" /> {record.projectName}
              </span>
            )}
          </div>

          {record.attachments && record.attachments.length > 0 && (
            <div className="inline-flex items-center gap-1 font-medium text-primary">
              <Paperclip className="size-3" /> {record.attachments.length} attachment
              {record.attachments.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
