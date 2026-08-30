"use client";

import { Check, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SECTION_CATALOG } from "@/lib/constants";
import { SECTION_ICONS } from "@/features/templates/lib/section-icons";
import type { SectionType } from "@/types";

interface SectionCatalogProps {
  addedTypes: Set<SectionType>;
  selectedTypes: Set<SectionType>;
  onAdd: (type: SectionType) => void;
  onToggleSelect: (type: SectionType) => void;
}

export function SectionCatalog({
  addedTypes,
  selectedTypes,
  onAdd,
  onToggleSelect,
}: SectionCatalogProps) {
  return (
    <div className="space-y-1.5">
      {SECTION_CATALOG.map((entry) => {
        const Icon = SECTION_ICONS[entry.type];
        const alreadyAdded = addedTypes.has(entry.type);
        const isSelected = selectedTypes.has(entry.type);
        return (
          <div
            key={entry.type}
            className={cn(
              "group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-accent/60",
              isSelected && "border-primary/40 bg-primary/5"
            )}
          >
            <button
              type="button"
              disabled={alreadyAdded}
              onClick={() => onToggleSelect(entry.type)}
              className="mt-0.5 shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Select ${entry.label}`}
            >
              <Checkbox checked={isSelected || alreadyAdded} disabled={alreadyAdded} />
            </button>
            <button
              type="button"
              disabled={alreadyAdded}
              onClick={() => onToggleSelect(entry.type)}
              className="flex min-w-0 flex-1 items-start gap-2.5 text-left disabled:cursor-not-allowed"
            >
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary">
                <Icon className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{entry.label}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {entry.description}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onAdd(entry.type)}
              disabled={alreadyAdded}
              aria-label={alreadyAdded ? `${entry.label} already added` : `Add ${entry.label}`}
              className={cn(
                buttonVariants({
                  variant: alreadyAdded ? "secondary" : "ghost",
                  size: "icon",
                }),
                "size-6 shrink-0 disabled:opacity-100"
              )}
            >
              {alreadyAdded ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
