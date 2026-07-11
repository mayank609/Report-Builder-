"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Layers } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionCatalog } from "@/features/templates/components/section-catalog";
import { SortableSectionItem } from "@/features/templates/components/sortable-section-item";
import { createSectionInstance } from "@/features/templates/lib/default-template";
import { SECTION_CATALOG } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SectionType, TemplateSection } from "@/types";

interface SectionBuilderProps {
  sections: TemplateSection[];
  onSectionsChange: (sections: TemplateSection[]) => void;
}

export function SectionBuilder({ sections, onSectionsChange }: SectionBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const addedTypes = new Set(sections.map((s) => s.type));

  const reindex = (list: TemplateSection[]) =>
    list.map((s, index) => ({ ...s, order: index }));

  const handleAdd = (type: SectionType) => {
    const catalogEntry = SECTION_CATALOG.find((c) => c.type === type);
    if (!catalogEntry) return;
    const newSection = createSectionInstance(
      type,
      catalogEntry.defaultTitle,
      catalogEntry.description,
      sortedSections.length
    );
    onSectionsChange([...sections, newSection]);
  };

  const handleChange = (id: string, patch: Partial<TemplateSection>) => {
    onSectionsChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleRemove = (id: string) => {
    onSectionsChange(reindex(sortedSections.filter((s) => s.id !== id)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedSections.findIndex((s) => s.id === active.id);
    const newIndex = sortedSections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onSectionsChange(reindex(arrayMove(sortedSections, oldIndex, newIndex)));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit py-4 lg:sticky lg:top-4">
        <CardHeader className="px-4">
          <CardTitle className="text-sm">Available Sections</CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          <ScrollArea className="h-[420px] pr-2">
            <div className="px-2">
              <SectionCatalog addedTypes={addedTypes} onAdd={handleAdd} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div>
        {sortedSections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No sections added"
            description="Click sections from the catalog on the left to add them to your template."
          />
        ) : (
          <>
            <p className="mb-2.5 text-xs text-muted-foreground">
              Drag up/down to reorder, or drag left/right to place two half-width sections
              side-by-side in the final report.
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedSections.map((s) => s.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-2">
                  {sortedSections.map((section, index) => (
                    <SortableSectionItem
                      key={section.id}
                      section={section}
                      index={index}
                      onChange={handleChange}
                      onRemove={handleRemove}
                      className={cn(section.width !== "half" && "sm:col-span-2")}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>
    </div>
  );
}
