"use client";

import { Controller, type Control } from "react-hook-form";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TemplateFormValues } from "@/features/templates/lib/template-schema";

interface InvoiceDefaultsPanelProps {
  control: Control<TemplateFormValues>;
}

export function InvoiceDefaultsPanel({ control }: InvoiceDefaultsPanelProps) {
  return (
    <Card className="py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Invoice Defaults</CardTitle>
        <CardDescription>
          Boilerplate text pre-filled whenever this template is used to create an invoice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        <div className="space-y-1.5">
          <Label htmlFor="numberingPrefix">Numbering Prefix</Label>
          <Controller
            name="invoiceDefaults.numberingPrefix"
            control={control}
            render={({ field }) => (
              <Input id="numberingPrefix" placeholder="INV" className="max-w-40" {...field} />
            )}
          />
          <p className="text-[11px] text-muted-foreground">
            Informational only — the active prefix used for numbering is set in Settings.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="termsAndConditions">Terms &amp; Conditions</Label>
          <Controller
            name="invoiceDefaults.termsAndConditions"
            control={control}
            render={({ field }) => (
              <Textarea id="termsAndConditions" rows={4} placeholder="Payment due within..." {...field} />
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="invoiceNotes">Notes</Label>
          <Controller
            name="invoiceDefaults.notes"
            control={control}
            render={({ field }) => (
              <Textarea id="invoiceNotes" rows={3} placeholder="Thank you for your business." {...field} />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
