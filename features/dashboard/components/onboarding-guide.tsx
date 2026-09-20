"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  FolderPlus,
  Users,
  FilePlus2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { settingsService, projectService, clientService } from "@/services";
import type { AppSettings } from "@/types";

export function OnboardingGuide() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [projectCount, setProjectCount] = useState<number>(0);
  const [clientCount, setClientCount] = useState<number>(0);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, projs, cls] = await Promise.all([
          settingsService.get(),
          projectService.list().catch(() => []),
          clientService.list().catch(() => []),
        ]);
        setSettings(s);
        setProjectCount(projs.length);
        setClientCount(cls.length);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || dismissed) return null;

  const orgConfigured = Boolean(settings?.organizationName?.trim());
  const hasClients = clientCount > 0;
  const hasProjects = projectCount > 0;

  // If all basic steps are done, hide onboarding guide automatically
  if (orgConfigured && hasClients && hasProjects) {
    return null;
  }

  const steps = [
    {
      title: "Organization Profile",
      desc: "Add your company name, GSTIN, logo, and address for report headers and invoices.",
      done: orgConfigured,
      href: "/settings",
      actionText: "Configure Organization",
      icon: Building2,
    },
    {
      title: "Add Clients & Parties",
      desc: "Register your client entities, contractors, and project engineers.",
      done: hasClients,
      href: "/clients/new",
      actionText: "Add First Client",
      icon: Users,
    },
    {
      title: "Create a Project",
      desc: "Track construction sites, link contractors, and associate reports and invoices.",
      done: hasProjects,
      href: "/projects/new",
      actionText: "Create Project",
      icon: FolderPlus,
    },
    {
      title: "Generate AI Report",
      desc: "Assemble daily logs, milestones, and site data into branded PDF reports.",
      done: false,
      href: "/reports/generate",
      actionText: "Generate Report",
      icon: FilePlus2,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/20">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-3 top-3 size-7 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
        title="Dismiss guide"
      >
        <X className="size-4" />
      </Button>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Welcome to BuildReport AI</CardTitle>
            <CardDescription>
              Complete the quick setup steps below to start generating professional construction reports and GST invoices.
            </CardDescription>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Setup Progress</span>
            <span>{completedCount} of {steps.length} completed ({progressPercent}%)</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className={`flex flex-col justify-between rounded-lg border p-3.5 transition-colors ${
                  step.done
                    ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                    : "border-border/60 bg-background/80 hover:border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex size-7 items-center justify-center rounded-md ${
                        step.done
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </div>
                    {step.done && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> Done
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2.5 text-sm font-semibold">{step.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-4">
                  <Button
                    size="sm"
                    variant={step.done ? "ghost" : "default"}
                    className={`w-full justify-between text-xs ${
                      step.done ? "text-muted-foreground hover:text-foreground" : ""
                    }`}
                    asChild
                  >
                    <Link href={step.href}>
                      <span>{step.actionText}</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
