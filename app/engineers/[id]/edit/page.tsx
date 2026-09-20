"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAsync } from "@/hooks/use-async";
import { engineerService } from "@/services";
import type { Engineer } from "@/types";

export default function EditEngineerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: engineer, loading, error, refetch } = useAsync(() => engineerService.getById(id), [id]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Engineer>>({});
  const [initialized, setInitialized] = useState(false);

  if (engineer && !initialized) { setForm(engineer); setInitialized(true); }

  const update = (patch: Partial<Engineer>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await engineerService.update(id, form);
      toast.success("Engineer updated");
      router.push("/engineers");
    } catch { toast.error("Failed to update engineer"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="mx-auto max-w-2xl space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (error || !engineer) return <ErrorState title="Engineer not found" onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/engineers" className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to Engineers
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Edit Engineer</h1>
      </div>
      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Engineer Details</CardTitle>
          <CardDescription>Update engineer information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name || ""} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="designation">Designation</Label>
              <Input id="designation" value={form.designation || ""} onChange={(e) => update({ designation: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="discipline">Discipline</Label>
              <Input id="discipline" value={form.discipline || ""} onChange={(e) => update({ discipline: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input id="licenseNumber" value={form.licenseNumber || ""} onChange={(e) => update({ licenseNumber: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email || ""} onChange={(e) => update({ email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone || ""} onChange={(e) => update({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="experience">Years of Experience</Label>
              <Input id="experience" type="number" min={0} value={form.yearsExperience || 0} onChange={(e) => update({ yearsExperience: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild><Link href="/engineers">Cancel</Link></Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
