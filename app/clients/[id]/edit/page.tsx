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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/use-async";
import { clientService } from "@/services";
import type { Client } from "@/types";

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: client, loading, error, refetch } = useAsync(() => clientService.getById(id), [id]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialize form from loaded data
  if (client && !initialized) {
    setForm(client);
    setInitialized(true);
  }

  const update = (patch: Partial<Client>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error("Client name is required");
      return;
    }
    setSaving(true);
    try {
      await clientService.update(id, form);
      toast.success("Client updated");
      router.push("/clients");
    } catch {
      toast.error("Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !client) {
    return <ErrorState title="Client not found" description="This client may have been deleted." onRetry={refetch} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/clients"
          className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Clients
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Edit Client</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the client details below.
        </p>
      </div>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Client Details</CardTitle>
          <CardDescription>Basic information about this client.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={form.name || ""}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={form.companyName || ""}
                onChange={(e) => update({ companyName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email || ""}
                onChange={(e) => update({ email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone || ""}
                onChange={(e) => update({ phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address || ""}
              onChange={(e) => update({ address: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="clientType">Client Type</Label>
              <Select
                value={form.clientType || "corporate"}
                onValueChange={(v) => update({ clientType: v as Client["clientType"] })}
              >
                <SelectTrigger id="clientType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN</Label>
              <Input
                id="gstin"
                value={form.gstin || ""}
                onChange={(e) => update({ gstin: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="billingState">Billing State</Label>
              <Input
                id="billingState"
                value={form.billingState || ""}
                onChange={(e) => update({ billingState: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/clients">Cancel</Link>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
