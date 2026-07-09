"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, KeyRound, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import { settingsService } from "@/services";
import { FONT_OPTIONS } from "@/lib/constants";
import type { AppSettings } from "@/types";

export function SettingsForm() {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsService.get().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const update = (patch: Partial<AppSettings>) => setSettings({ ...settings, ...patch });

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.update(settings);
      setTheme(settings.defaultTheme);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const reset = await settingsService.reset();
    setSettings(reset);
    toast.info("Settings reset to defaults");
  };

  return (
    <div className="space-y-6">
      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Organization</CardTitle>
          <CardDescription>General information used across generated reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={settings.organizationName}
              onChange={(e) => update({ organizationName: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Report Defaults</CardTitle>
          <CardDescription>Defaults applied when creating a new template.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="defaultFont">Default Font</Label>
              <Select value={settings.defaultFont} onValueChange={(v) => update({ defaultFont: v })}>
                <SelectTrigger id="defaultFont" className="w-full">
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
            </div>
            <div className="space-y-1.5">
              <Label>Default Orientation</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={settings.defaultOrientation}
                onValueChange={(v) => v && update({ defaultOrientation: v as AppSettings["defaultOrientation"] })}
                className="w-full"
              >
                <ToggleGroupItem value="portrait" className="flex-1">
                  Portrait
                </ToggleGroupItem>
                <ToggleGroupItem value="landscape" className="flex-1">
                  Landscape
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoAiSummary">Auto-include AI Summary</Label>
              <p className="text-xs text-muted-foreground">
                Automatically add an AI Summary section to new templates.
              </p>
            </div>
            <Switch
              id="autoAiSummary"
              checked={settings.autoIncludeAiSummary}
              onCheckedChange={(checked) => update({ autoIncludeAiSummary: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Choose how BuildReport AI looks on your device.</CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={settings.defaultTheme}
              onValueChange={(v) => v && update({ defaultTheme: v as AppSettings["defaultTheme"] })}
              className="w-full sm:w-fit"
            >
              <ToggleGroupItem value="light" className="flex-1">
                Light
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" className="flex-1">
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem value="system" className="flex-1">
                System
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" /> Gemini API Key
          </CardTitle>
          <CardDescription>
            Used for AI template generation and AI report writing. Stored locally in your browser
            only — never sent anywhere except directly to Google&apos;s Gemini API. Leave blank to use
            built-in smart defaults instead of live AI calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="geminiKey">API Key</Label>
            <Input
              id="geminiKey"
              type="password"
              placeholder="AIza..."
              value={settings.geminiApiKey}
              onChange={(e) => update({ geminiApiKey: e.target.value })}
            />
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Get a Gemini API key <ExternalLink className="size-3" />
          </a>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="size-4" /> Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4" /> {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
