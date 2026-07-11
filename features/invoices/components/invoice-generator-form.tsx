"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Settings2, Save, Send, Receipt } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";

import { useInvoiceReferenceData } from "@/features/invoices/hooks/use-invoice-reference-data";
import { GstBranchManagerDialog } from "@/features/invoices/components/gst-branch-manager-dialog";
import { invoiceFormSchema, type InvoiceFormValues } from "@/features/invoices/lib/invoice-schema";
import { calculateInvoiceTotals } from "@/lib/gst/calculate";
import { stateCodeFromGstin, stateCodeFromName, INDIAN_STATES } from "@/lib/gst/india-states";
import { generateId, formatCurrency } from "@/lib/utils";
import { invoiceService, settingsService, templateService } from "@/services";
import type { GstBranch, InvoiceInput } from "@/types";

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return formatCurrency(value);
  }
}

function newLineItem() {
  return {
    id: generateId("li"),
    description: "",
    hsnSac: "",
    quantity: 1,
    unit: "lot",
    rate: 0,
    discountPercent: 0,
    taxRatePercent: 18,
  };
}

export function InvoiceGeneratorForm() {
  const router = useRouter();
  const { builders, projects, clients, templates, loading, error, refetch } =
    useInvoiceReferenceData();
  const [submitting, setSubmitting] = useState<"draft" | "sent" | null>(null);
  const [gstDialogOpen, setGstDialogOpen] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      builderId: "",
      gstBranchId: null,
      clientId: "",
      projectId: null,
      templateId: null,
      docType: "tax_invoice",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date().toISOString().slice(0, 10),
      currency: "INR",
      billTo: { clientId: "", name: "", companyName: "", address: "", gstin: "", state: "" },
      lineItems: [newLineItem()],
      notes: "",
      termsAndConditions: "",
    },
  });

  useEffect(() => {
    settingsService.get().then((s) => {
      setValue("currency", s.defaultCurrency);
      if (!getValues("termsAndConditions")) setValue("termsAndConditions", s.defaultInvoiceTerms);
      if (!getValues("notes")) setValue("notes", s.defaultInvoiceNotes);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  const builderId = watch("builderId");
  const gstBranchId = watch("gstBranchId");
  const billTo = watch("billTo");
  const currency = watch("currency");
  const lineItems = watch("lineItems");

  const selectedBuilder = useMemo(
    () => builders.find((b) => b.id === builderId) ?? null,
    [builders, builderId]
  );

  const filteredProjects = useMemo(
    () => projects.filter((p) => !builderId || p.builderId === builderId),
    [projects, builderId]
  );

  const selectedGstBranch: GstBranch | null = useMemo(
    () => selectedBuilder?.gstBranches.find((b) => b.id === gstBranchId) ?? null,
    [selectedBuilder, gstBranchId]
  );

  useEffect(() => {
    if (!selectedBuilder) return;
    const current = getValues("gstBranchId");
    if (current && selectedBuilder.gstBranches.some((b) => b.id === current)) return;
    const defaultBranch = selectedBuilder.gstBranches.find((b) => b.isDefault) ?? selectedBuilder.gstBranches[0];
    setValue("gstBranchId", defaultBranch?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuilder]);

  const handleClientChange = (clientId: string) => {
    setValue("clientId", clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setValue("billTo", {
        clientId: client.id,
        name: client.name,
        companyName: client.companyName,
        address: client.address,
        gstin: client.gstin ?? "",
        state: client.billingState ?? "",
      });
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const value = templateId === "none" ? null : templateId;
    setValue("templateId", value);
    const template = templates.find((t) => t.id === value);
    if (template?.invoiceDefaults) {
      if (!getValues("termsAndConditions")) {
        setValue("termsAndConditions", template.invoiceDefaults.termsAndConditions);
      }
      if (!getValues("notes")) {
        setValue("notes", template.invoiceDefaults.notes);
      }
    }
  };

  const totals = useMemo(() => {
    const sellerStateCode = selectedGstBranch?.stateCode ?? null;
    const buyerStateCode = billTo.gstin
      ? stateCodeFromGstin(billTo.gstin) ?? stateCodeFromName(billTo.state)
      : stateCodeFromName(billTo.state);
    return calculateInvoiceTotals(lineItems, sellerStateCode, buyerStateCode);
  }, [lineItems, selectedGstBranch, billTo.gstin, billTo.state]);

  const onSubmit = async (values: InvoiceFormValues, status: "draft" | "sent") => {
    setSubmitting(status);
    try {
      const project = values.projectId ? projects.find((p) => p.id === values.projectId) : null;
      const template = values.templateId ? templates.find((t) => t.id === values.templateId) : null;

      const input: InvoiceInput = {
        docType: values.docType,
        status,
        templateId: values.templateId,
        templateName: template?.name ?? null,
        builderId: values.builderId,
        gstBranchId: values.gstBranchId,
        projectId: values.projectId,
        projectName: project?.name ?? null,
        billTo: values.billTo,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        currency: values.currency,
        lineItems: values.lineItems,
        notes: values.notes,
        termsAndConditions: values.termsAndConditions,
        amountPaid: 0,
      };

      const invoice = await invoiceService.create(input);
      if (template) await templateService.incrementUsage(template.id);

      toast.success(status === "draft" ? "Invoice saved as draft" : "Invoice issued");
      router.push(`/invoices/${invoice.id}/preview`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState onRetry={refetch} />;

  if (builders.length === 0 || clients.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Reference data missing"
        description="At least one builder and client are required to create an invoice."
      />
    );
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Invoice Details</CardTitle>
          <CardDescription>Choose who is billing, who is being billed, and the GSTIN to invoice from.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Document Type</Label>
            <Controller
              name="docType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tax_invoice">Tax Invoice</SelectItem>
                    <SelectItem value="proforma_invoice">Proforma Invoice</SelectItem>
                    <SelectItem value="credit_note">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Template (optional)</Label>
            <Controller
              name="templateId"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? "none"} onValueChange={handleTemplateChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Blank invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Blank invoice</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Builder (billing from)</Label>
            <Controller
              name="builderId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue("projectId", null);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select builder" />
                  </SelectTrigger>
                  <SelectContent>
                    {builders.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.builderId && <p className="text-xs text-destructive">{errors.builderId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>GST Branch</Label>
            <div className="flex gap-1.5">
              <Controller
                name="gstBranchId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                    disabled={!selectedBuilder}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No GSTIN" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No GSTIN registered</SelectItem>
                      {selectedBuilder?.gstBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.label} ({b.gstin})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!selectedBuilder}
                onClick={() => setGstDialogOpen(true)}
                title="Manage GSTINs"
              >
                <Settings2 className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Project (optional)</Label>
            <Controller
              name="projectId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Client (billing to)</Label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={handleClientChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issueDate">Issue Date</Label>
            <Controller
              name="issueDate"
              control={control}
              render={({ field }) => <Input id="issueDate" type="date" {...field} />}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dueDate">Due Date</Label>
            <Controller
              name="dueDate"
              control={control}
              render={({ field }) => <Input id="dueDate" type="date" {...field} />}
            />
            {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Controller
              name="currency"
              control={control}
              render={({ field }) => <Input id="currency" className="max-w-32" {...field} />}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Bill To</CardTitle>
          <CardDescription>
            Snapshotted onto the invoice — editing here does not change the saved client record.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="billToCompany">Company / Client Name</Label>
            <Controller
              name="billTo.companyName"
              control={control}
              render={({ field }) => <Input id="billToCompany" {...field} />}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="billToName">Contact Name</Label>
            <Controller
              name="billTo.name"
              control={control}
              render={({ field }) => <Input id="billToName" {...field} />}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="billToAddress">Address</Label>
            <Controller
              name="billTo.address"
              control={control}
              render={({ field }) => <Input id="billToAddress" {...field} />}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="billToGstin">GSTIN (optional)</Label>
            <Controller
              name="billTo.gstin"
              control={control}
              render={({ field }) => (
                <Input id="billToGstin" className="uppercase" placeholder="Unregistered" {...field} />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Place of Supply (State)</Label>
            <Controller
              name="billTo.state"
              control={control}
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s.gstStateCode} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="flex-row items-center justify-between px-5">
          <div>
            <CardTitle className="text-base">Line Items</CardTitle>
            <CardDescription>
              {totals.isInterState
                ? "Inter-state supply — IGST will be charged."
                : "Intra-state supply — CGST + SGST will be charged."}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append(newLineItem())}>
            <Plus className="size-3.5" /> Add Line
          </Button>
        </CardHeader>
        <CardContent className="px-5">
          {errors.lineItems?.root && (
            <p className="mb-2 text-xs text-destructive">{errors.lineItems.root.message}</p>
          )}
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Description</th>
                  <th className="px-2 py-2 font-medium">HSN/SAC</th>
                  <th className="px-2 py-2 font-medium">Qty</th>
                  <th className="px-2 py-2 font-medium">Unit</th>
                  <th className="px-2 py-2 font-medium">Rate</th>
                  <th className="px-2 py-2 font-medium">Disc %</th>
                  <th className="px-2 py-2 font-medium">Tax %</th>
                  <th className="px-2 py-2 text-right font-medium">Line Total</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.map((field, index) => {
                  const item = lineItems[index];
                  const gross = (item?.quantity ?? 0) * (item?.rate ?? 0);
                  const taxable = gross - gross * ((item?.discountPercent ?? 0) / 100);
                  const lineTotal = taxable + taxable * ((item?.taxRatePercent ?? 0) / 100);
                  return (
                    <tr key={field.id}>
                      <td className="px-2 py-1.5">
                        <Controller
                          name={`lineItems.${index}.description`}
                          control={control}
                          render={({ field: f }) => (
                            <Input {...f} placeholder="Item description" className="h-8 min-w-[200px]" />
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller
                          name={`lineItems.${index}.hsnSac`}
                          control={control}
                          render={({ field: f }) => <Input {...f} className="h-8 w-24" />}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller
                          name={`lineItems.${index}.quantity`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              name={f.name}
                              ref={f.ref}
                              onBlur={f.onBlur}
                              value={f.value}
                              onChange={(e) => f.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                              type="number"
                              step="any"
                              className="h-8 w-20"
                            />
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller
                          name={`lineItems.${index}.unit`}
                          control={control}
                          render={({ field: f }) => <Input {...f} className="h-8 w-16" />}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller
                          name={`lineItems.${index}.rate`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              name={f.name}
                              ref={f.ref}
                              onBlur={f.onBlur}
                              value={f.value}
                              onChange={(e) => f.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                              type="number"
                              step="any"
                              className="h-8 w-24"
                            />
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller
                          name={`lineItems.${index}.discountPercent`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              name={f.name}
                              ref={f.ref}
                              onBlur={f.onBlur}
                              value={f.value}
                              onChange={(e) => f.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                              type="number"
                              step="any"
                              className="h-8 w-16"
                            />
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Controller
                          name={`lineItems.${index}.taxRatePercent`}
                          control={control}
                          render={({ field: f }) => (
                            <Input
                              name={f.name}
                              ref={f.ref}
                              onBlur={f.onBlur}
                              value={f.value}
                              onChange={(e) => f.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                              type="number"
                              step="any"
                              className="h-8 w-16"
                            />
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium">
                        {formatMoney(lineTotal, currency)}
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Totals</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          <div className="ml-auto max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(totals.subtotal, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatMoney(totals.totalDiscount, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxable Value</span>
              <span>{formatMoney(totals.taxableValue, currency)}</span>
            </div>
            {totals.taxBreakup.map((b) =>
              totals.isInterState ? (
                <div key={b.taxRatePercent} className="flex justify-between">
                  <span className="text-muted-foreground">IGST @ {b.taxRatePercent}%</span>
                  <span>{formatMoney(b.igst, currency)}</span>
                </div>
              ) : (
                <div key={b.taxRatePercent} className="flex justify-between">
                  <span className="text-muted-foreground">
                    CGST + SGST @ {b.taxRatePercent}%
                  </span>
                  <span>{formatMoney(b.cgst + b.sgst, currency)}</span>
                </div>
              )
            )}
            <Separator className="my-1.5" />
            <div className="flex justify-between text-base font-bold text-foreground">
              <span>Grand Total</span>
              <span>{formatMoney(totals.grandTotal, currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="py-5">
        <CardHeader className="px-5">
          <CardTitle className="text-base">Notes &amp; Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 px-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => <Textarea id="notes" rows={4} {...field} />}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Terms &amp; Conditions</Label>
            <Controller
              name="termsAndConditions"
              control={control}
              render={({ field }) => <Textarea id="terms" rows={4} {...field} />}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={submitting !== null}
          onClick={handleSubmit((values) => onSubmit(values, "draft"))}
        >
          {submitting === "draft" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save as Draft
        </Button>
        <Button
          type="button"
          size="lg"
          disabled={submitting !== null}
          onClick={handleSubmit((values) => onSubmit(values, "sent"))}
        >
          {submitting === "sent" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Issue Invoice
        </Button>
      </div>

      <GstBranchManagerDialog
        open={gstDialogOpen}
        onOpenChange={setGstDialogOpen}
        builder={selectedBuilder}
        onSaved={() => refetch()}
      />
    </motion.form>
  );
}
