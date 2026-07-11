import { z } from "zod";

export const invoiceLineItemFormSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required"),
  hsnSac: z.string(),
  quantity: z.number().min(0.01, "Must be greater than 0"),
  unit: z.string().min(1, "Required"),
  rate: z.number().min(0, "Must be 0 or more"),
  discountPercent: z.number().min(0).max(100),
  taxRatePercent: z.number().min(0).max(100),
});

export const invoiceFormSchema = z
  .object({
    builderId: z.string().min(1, "Select a builder"),
    gstBranchId: z.string().nullable(),
    clientId: z.string().min(1, "Select a client"),
    projectId: z.string().nullable(),
    templateId: z.string().nullable(),
    docType: z.enum(["tax_invoice", "proforma_invoice", "credit_note"]),
    issueDate: z.string().min(1, "Select an issue date"),
    dueDate: z.string().min(1, "Select a due date"),
    currency: z.string().min(1),
    billTo: z.object({
      clientId: z.string(),
      name: z.string().min(1, "Bill-to name is required"),
      companyName: z.string(),
      address: z.string().min(1, "Bill-to address is required"),
      gstin: z.string(),
      state: z.string(),
    }),
    lineItems: z.array(invoiceLineItemFormSchema).min(1, "Add at least one line item"),
    notes: z.string(),
    termsAndConditions: z.string(),
  })
  .refine((data) => new Date(data.issueDate) <= new Date(data.dueDate), {
    message: "Due date must be on or after the issue date",
    path: ["dueDate"],
  });

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
