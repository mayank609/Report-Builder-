"use client";

import { useRef, useState } from "react";
import { Upload, FileUp, FileText, Receipt, Info } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { importTemplateFromFile } from "@/lib/ai/client";
import type { AiTemplateImportSuggestion, DocumentKind } from "@/types";

interface TemplateImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (suggestion: AiTemplateImportSuggestion) => void;
}

const ACCEPTED_EXTENSIONS = ".docx,.pdf,.txt,.md";

export function TemplateImportDialog({ open, onOpenChange, onApply }: TemplateImportDialogProps) {
  const [documentKind, setDocumentKind] = useState<DocumentKind>("report");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiTemplateImportSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Choose a .docx, .pdf, or .txt file to import.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const suggestion = await importTemplateFromFile(file, documentKind);
      setResult(suggestion);
      toast.success(
        suggestion.source === "gemini"
          ? "Template drafted with Gemini"
          : "Template drafted with smart defaults (no Gemini API key configured)"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import template");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    toast.success("Template builder populated from your document");
    onOpenChange(false);
    reset();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <FileUp className="size-4 text-primary" /> Import Your Own Template
          </SheetTitle>
          <SheetDescription>
            Upload a Word or PDF document you already use — AI will turn it into an editable
            template.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">This document is a</p>
              <ToggleGroup
                type="single"
                variant="outline"
                value={documentKind}
                onValueChange={(value) => value && setDocumentKind(value as DocumentKind)}
                className="w-full"
              >
                <ToggleGroupItem value="report" className="flex-1 gap-1.5">
                  <FileText className="size-4" /> Report
                </ToggleGroupItem>
                <ToggleGroupItem value="invoice" className="flex-1 gap-1.5">
                  <Receipt className="size-4" /> Invoice
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
            >
              <Upload className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {file ? file.name : "Click to choose a file"}
              </span>
              <span className="text-[11px] text-muted-foreground">.docx, .pdf, .txt — up to 15MB</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            <Button onClick={handleImport} disabled={loading || !file} className="w-full">
              <FileUp className="size-4" />
              {loading ? "Reading document…" : "Import & Draft Template"}
            </Button>

            {result && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{result.name}</h4>
                      <p className="mt-0.5 text-xs text-muted-foreground">{result.description}</p>
                    </div>
                    <Badge variant={result.source === "gemini" ? "success" : "secondary"} className="shrink-0">
                      {result.source === "gemini" ? "Gemini" : "Smart Default"}
                    </Badge>
                  </div>

                  {result.documentKind === "report" && result.sections && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-foreground">
                        Detected Sections ({result.sections.length})
                      </p>
                      <ul className="space-y-1">
                        {result.sections.map((section, i) => (
                          <li
                            key={`${section.type}-${i}`}
                            className="rounded-md border px-2.5 py-1.5 text-xs font-medium text-foreground"
                          >
                            {section.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.documentKind === "invoice" && (
                    <div className="space-y-2">
                      <div>
                        <p className="mb-1 text-xs font-medium text-foreground">Terms &amp; Conditions</p>
                        <p className="text-xs text-muted-foreground">{result.termsAndConditions}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-foreground">Notes</p>
                        <p className="text-xs text-muted-foreground">{result.notes}</p>
                      </div>
                      {result.detectedGstin && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-foreground">Detected GSTIN</p>
                          <Badge variant="outline">{result.detectedGstin}</Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {result.extractedTheme ? (
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-foreground">
                        Matched Design
                      </p>
                      <div className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2">
                        <div className="flex -space-x-1.5">
                          {(
                            [
                              result.extractedTheme.colors.primary,
                              result.extractedTheme.colors.accent,
                              result.extractedTheme.colors.secondary,
                            ] as const
                          ).map((color, i) => (
                            <span
                              key={`${color}-${i}`}
                              className="size-5 rounded-full border-2 border-background"
                              style={{ background: color }}
                              title={color}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {result.extractedTheme.font
                            ? `Colors + "${result.extractedTheme.font}" font detected`
                            : "Colors detected from the document"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      No distinct branding colors detected in this document — the template
                      keeps its default theme, which you can still customize on the Layout tab.
                    </p>
                  )}

                  <div className="flex items-start gap-1.5 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                    <Info className="mt-0.5 size-3 shrink-0" />
                    Applying will replace the current template details (including the matched
                    design, if any). You can still edit everything afterwards.
                  </div>

                  <Button onClick={handleApply} className="w-full">
                    Apply to Template Builder
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
