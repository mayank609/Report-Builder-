"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

import { buildTemplatePreviewHtml } from "@/features/templates/lib/build-template-preview";
import type { TemplateFormValues } from "@/features/templates/lib/template-schema";
import { cn } from "@/lib/utils";

const PAGE_WIDTH = 816;
const PAGE_HEIGHT = 1200;

interface TemplatePreviewPanelProps {
  values: TemplateFormValues;
  className?: string;
  showHeader?: boolean;
}

export function TemplatePreviewPanel({
  values,
  className,
  showHeader = true,
}: TemplatePreviewPanelProps) {
  const [html, setHtml] = useState(() => buildTemplatePreviewHtml(values));
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const timeout = setTimeout(() => setHtml(buildTemplatePreviewHtml(values)), 300);
    return () => clearTimeout(timeout);
  }, [values]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setScale(Math.min(width / PAGE_WIDTH, 1));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sectionCount = values.sections.filter((s) => s.visible).length;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {showHeader && (
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Live Preview</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {sectionCount} visible section{sectionCount === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/40 p-3">
        <div
          style={{
            width: PAGE_WIDTH * scale,
            height: PAGE_HEIGHT * scale,
          }}
          className="mx-auto"
        >
          <iframe
            title="Template preview"
            srcDoc={html}
            style={{
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              border: "none",
            }}
            className="rounded-md bg-white shadow-md"
          />
        </div>
      </div>
    </div>
  );
}
