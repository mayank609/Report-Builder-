"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/use-async";
import { projectService, clientService, builderService } from "@/services";
import type { ProjectStatus } from "@/types";

export default function NewProjectPage() {
  const router = useRouter();
  const { data: clients } = useAsync(() => clientService.list());
  const { data: builders } = useAsync(() => builderService.list());
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    projectCode: "",
    builderId: "",
    clientId: "",
    type: "Residential",
    status: "planning" as ProjectStatus,
    address: "",
    city: "",
    state: "",
    startDate: "",
    estimatedEndDate: "",
    totalBudget: 0,
    description: "",
    siteAreaSqft: 0,
    floors: 0,
    units: 0,
    percentComplete: 0,
  });

  const update = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Project name is required"); return; }
    if (!form.projectCode.trim()) { toast.error("Project code is required"); return; }
    setSaving(true);
    try {
      const project = await projectService.create({
        ...form,
        actualEndDate: null,
        spentBudget: 0,
        contractorIds: [],
        engineerIds: [],
        materialUsage: [],
        equipment: [],
        labour: [],
        budgetBreakdown: [],
        milestones: [],
        dailyLogs: [],
        images: [],
        weatherLog: [],
        rfis: [],
        changeOrders: [],
        submittals: [],
        safetyIncidents: [],
        qualityInspections: [],
        punchList: [],
        deliveries: [],
        subcontractorLog: [],
        permits: [],
        risks: [],
        lookAheadSchedule: [],
        visitorLog: [],
      });
      toast.success("Project created");
      router.push(`/projects/${project.id}`);
    } catch { toast.error("Failed to create project"); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/projects" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Projects
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Create New Project</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new construction project. You can add detailed data later.
        </p>
      </div>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Project Information</CardTitle>
          <CardDescription>Basic details about this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project Name *</Label>
              <Input id="name" placeholder="e.g. Skyline Tower Phase 2" value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projectCode">Project Code *</Label>
              <Input id="projectCode" placeholder="e.g. PROJ-2024-001" value={form.projectCode} onChange={(e) => update({ projectCode: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Project Type</Label>
              <Select value={form.type} onValueChange={(v) => update({ type: v })}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="Industrial">Industrial</SelectItem>
                  <SelectItem value="Mixed Use">Mixed Use</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v) => update({ status: v as ProjectStatus })}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} placeholder="Brief description of the project scope…" value={form.description} onChange={(e) => update({ description: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Stakeholders</CardTitle>
          <CardDescription>Link this project to a builder and client.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="builderId">Builder / Organization</Label>
              <Select value={form.builderId} onValueChange={(v) => update({ builderId: v })}>
                <SelectTrigger id="builderId"><SelectValue placeholder="Select builder" /></SelectTrigger>
                <SelectContent>
                  {builders?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.companyName || b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientId">Client</Label>
              <Select value={form.clientId} onValueChange={(v) => update({ clientId: v })}>
                <SelectTrigger id="clientId"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!clients || clients.length === 0) && (
                <p className="text-[11px] text-muted-foreground">
                  No clients yet. <Link href="/clients/new" className="text-primary hover:underline">Add one first</Link>.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Location & Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="e.g. Plot 42, Industrial Area" value={form.address} onChange={(e) => update({ address: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" placeholder="e.g. Mumbai" value={form.city} onChange={(e) => update({ city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="e.g. Maharashtra" value={form.state} onChange={(e) => update({ state: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Estimated End Date</Label>
              <Input id="endDate" type="date" value={form.estimatedEndDate} onChange={(e) => update({ estimatedEndDate: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="budget">Total Budget (₹)</Label>
              <Input id="budget" type="number" min={0} value={form.totalBudget || ""} onChange={(e) => update({ totalBudget: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area">Site Area (sq.ft.)</Label>
              <Input id="area" type="number" min={0} value={form.siteAreaSqft || ""} onChange={(e) => update({ siteAreaSqft: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="floors">Floors</Label>
              <Input id="floors" type="number" min={0} value={form.floors || ""} onChange={(e) => update({ floors: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link href="/projects">Cancel</Link></Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Creating…" : "Create Project"}
        </Button>
      </div>
    </div>
  );
}
