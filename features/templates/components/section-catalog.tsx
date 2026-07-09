"use client";

import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { SECTION_CATALOG } from "@/lib/constants";
import { SECTION_ICONS } from "@/features/templates/lib/section-icons";
import type { SectionType } from "@/types";

interface SectionCatalogProps {
  addedTypes: Set<SectionType>;
  onAdd: (type: SectionType) => void;
}

export function SectionCatalog({ addedTypes, onAdd }: SectionCatalogProps) {
  return (
    <div className="space-y-1.5">
      {SECTION_CATALOG.map((entry) => {
        const Icon = SECTION_ICONS[entry.type];
        const alreadyAdded = addedTypes.has(entry.type);
        return (
          <button
            key={entry.type}
            type="button"
            onClick={() => onAdd(entry.type)}
            className="group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-accent/60"
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
            <span
              aria-hidden="true"
              className={cn(
                buttonVariants({
                  variant: alreadyAdded ? "secondary" : "ghost",
                  size: "icon",
                }),
                "pointer-events-none size-6 shrink-0"
              )}
            >
              <Plus className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
