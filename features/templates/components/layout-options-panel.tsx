"use client";

import { Controller, type Control } from "react-hook-form";
import { RectangleHorizontal, RectangleVertical, Check } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { FONT_OPTIONS, THEME_PRESETS } from "@/lib/constants";
import type { TemplateFormValues } from "@/features/templates/lib/template-schema";

const LAYOUT_TOGGLES: {
  key: keyof TemplateFormValues["layout"];
  label: string;
  description: string;
}[] = [
  { key: "coverPage", label: "Cover Page", description: "Include a dedicated title page." },
  { key: "header", label: "Header", description: "Show a repeating page header." },
  { key: "footer", label: "Footer", description: "Show a repeating page footer." },
  { key: "logo", label: "Logo", description: "Display the builder's logo." },
  { key: "watermark", label: "Watermark", description: "Overlay a subtle watermark." },
  { key: "pageNumbers", label: "Page Numbers", description: "Number every page." },
];

interface LayoutOptionsPanelProps {
  control: Control<TemplateFormValues>;
}

export function LayoutOptionsPanel({ control }: LayoutOptionsPanelProps) {
  return (
    <Card className="py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Layout Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {LAYOUT_TOGGLES.map((toggle) => (
            <Controller
              key={toggle.key}
              name={`layout.${toggle.key}` as const}
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                  <div>
                    <Label htmlFor={toggle.key} className="text-sm">
                      {toggle.label}
                    </Label>
                    <p className="text-[11px] text-muted-foreground">{toggle.description}</p>
                  </div>
                  <Switch
                    id={toggle.key}
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          ))}
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Orientation</Label>
            <Controller
              name="layout.orientation"
              control={control}
              render={({ field }) => (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={field.value}
                  onValueChange={(value) => value && field.onChange(value)}
                  className="w-full"
                >
                  <ToggleGroupItem value="portrait" className="flex-1 gap-1.5">
                    <RectangleVertical className="size-4" /> Portrait
                  </ToggleGroupItem>
                  <ToggleGroupItem value="landscape" className="flex-1 gap-1.5">
                    <RectangleHorizontal className="size-4" /> Landscape
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="font">Font</Label>
            <Controller
              name="layout.font"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="font" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>Theme Colors</Label>
          <Controller
            name="layout.themeColors"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {THEME_PRESETS.map((preset) => {
                  const isActive = field.value.primary === preset.colors.primary;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => field.onChange(preset.colors)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors hover:border-primary/50",
                        isActive && "border-primary ring-1 ring-primary"
                      )}
                    >
                      <span className="relative flex size-6 shrink-0 overflow-hidden rounded-full border">
                        <span
                          className="absolute inset-0 left-0 w-1/2"
                          style={{ background: preset.colors.primary }}
                        />
                        <span
                          className="absolute inset-0 left-1/2 w-1/2"
                          style={{ background: preset.colors.accent }}
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">
                        {preset.name}
                      </span>
                      {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
