"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  RectangleHorizontal,
  Columns2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SECTION_ICONS } from "@/features/templates/lib/section-icons";
import type { TemplateSection } from "@/types";

interface SortableSectionItemProps {
  section: TemplateSection;
  index: number;
  onChange: (id: string, patch: Partial<TemplateSection>) => void;
  onRemove: (id: string) => void;
  className?: string;
}

export function SortableSectionItem({
  section,
  index,
  onChange,
  onRemove,
  className,
}: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = SECTION_ICONS[section.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card shadow-xs",
        isDragging && "z-10 opacity-90 shadow-lg",
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder — drop left/right to place side-by-side, up/down to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {index + 1}. {section.title}
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() =>
                onChange(section.id, { width: section.width === "half" ? "full" : "half" })
              }
            >
              {section.width === "half" ? (
                <Columns2 className="size-4 text-primary" />
              ) : (
                <RectangleHorizontal className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {section.width === "half"
              ? "Half width — sits side-by-side with a neighboring half-width section"
              : "Full width — click to make half width"}
          </TooltipContent>
        </Tooltip>
        {section.required && (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Lock className="size-2.5" /> Required
          </Badge>
        )}
        {!section.visible && (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <EyeOff className="size-2.5" /> Hidden
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => onChange(section.id, { collapsed: !section.collapsed })}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", !section.collapsed && "rotate-180")}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(section.id)}
          disabled={section.required}
          title={section.required ? "Required sections cannot be removed" : "Delete section"}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {!section.collapsed && (
        <div className="space-y-3 border-t px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`title-${section.id}`}>Title</Label>
              <Input
                id={`title-${section.id}`}
                value={section.title}
                onChange={(e) => onChange(section.id, { title: e.target.value })}
                disabled={!section.editable}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`desc-${section.id}`}>Description</Label>
              <Input
                id={`desc-${section.id}`}
                value={section.description}
                onChange={(e) => onChange(section.id, { description: e.target.value })}
                disabled={!section.editable}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            <div className="flex items-center gap-2">
              <Switch
                id={`required-${section.id}`}
                checked={section.required}
                onCheckedChange={(checked) => onChange(section.id, { required: checked })}
              />
              <Label htmlFor={`required-${section.id}`} className="text-xs font-normal">
                Required
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id={`editable-${section.id}`}
                checked={section.editable}
                onCheckedChange={(checked) => onChange(section.id, { editable: checked })}
              />
              <Label htmlFor={`editable-${section.id}`} className="text-xs font-normal">
                Editable
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id={`visible-${section.id}`}
                checked={section.visible}
                onCheckedChange={(checked) => onChange(section.id, { visible: checked })}
              />
              <Label
                htmlFor={`visible-${section.id}`}
                className="flex items-center gap-1 text-xs font-normal"
              >
                {section.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                Visible
              </Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
