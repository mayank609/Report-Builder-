"use client";

import { useState } from "react";
import { Sparkles, Wand2, Table2, Palette, MessageSquareText, Info } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateTemplateFromPrompt } from "@/lib/ai/client";
import { SECTION_ICONS } from "@/features/templates/lib/section-icons";
import type { AiTemplateSuggestion } from "@/types";

const EXAMPLE_PROMPTS = [
  "Create a professional Daily Progress Report template for a residential construction project.",
  "Build a Weekly Progress Report for a commercial high-rise with budget tracking.",
  "Generate a Site Safety Audit template with findings and recommendations.",
];

interface AiGeneratorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (suggestion: AiTemplateSuggestion) => void;
}

export function AiGeneratorPanel({ open, onOpenChange, onApply }: AiGeneratorPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiTemplateSuggestion | null>(null);

  const handleGenerate = async () => {
    if (prompt.trim().length < 8) {
      toast.error("Please describe the report template in more detail.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const suggestion = await generateTemplateFromPrompt(prompt.trim());
      setResult(suggestion);
      if (suggestion.source === "fallback") {
        toast.info("Generated with smart defaults (no Gemini API key configured in Settings).");
      } else {
        toast.success("Template generated with Gemini");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate template");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApply(result);
    toast.success("Template builder populated with AI suggestions");
    onOpenChange(false);
    setResult(null);
    setPrompt("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> AI Template Generator
          </SheetTitle>
          <SheetDescription>
            Describe the report you need and Gemini will draft a full template structure.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <Textarea
              placeholder='e.g. "Create a professional Daily Progress Report template for a residential construction project."'
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Try an example</p>
              <div className="flex flex-col gap-1.5">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="rounded-md border px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              <Wand2 className="size-4" />
              {loading ? "Generating…" : "Generate Template"}
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

                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <Sparkles className="size-3.5" /> Suggested Sections ({result.sections.length})
                    </p>
                    <ul className="space-y-1">
                      {result.sections.map((section, i) => {
                        const Icon = SECTION_ICONS[section.type];
                        return (
                          <li
                            key={`${section.type}-${i}`}
                            className="flex items-start gap-2 rounded-md border px-2.5 py-1.5"
                          >
                            <Icon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground">
                                {section.title}
                              </p>
                              <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                {section.description}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {result.recommendedTables.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Table2 className="size-3.5" /> Recommended Tables
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.recommendedTables.map((table) => (
                          <Badge key={table} variant="outline">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.formattingNotes && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Palette className="size-3.5" /> Formatting Notes
                      </p>
                      <p className="text-xs text-muted-foreground">{result.formattingNotes}</p>
                    </div>
                  )}

                  {result.summaryPrompts.length > 0 && (
                    <div>
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <MessageSquareText className="size-3.5" /> Summary Prompts
                      </p>
                      <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                        {result.summaryPrompts.map((sp, i) => (
                          <li key={i}>{sp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-start gap-1.5 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                    <Info className="mt-0.5 size-3 shrink-0" />
                    Applying will replace the current template details and sections. You can
                    still edit everything afterwards.
                  </div>

                  <Button onClick={handleApply} className="w-full" variant="default">
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
