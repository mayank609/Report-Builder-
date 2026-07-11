import { builderService, invoiceService, templateService } from "@/services";
import { DEFAULT_THEME_COLORS } from "@/lib/constants";
import type { InvoiceRenderContext } from "@/lib/pdf/invoice-html";
import type { TemplateLayout } from "@/types";

const DEFAULT_INVOICE_LAYOUT: TemplateLayout = {
  coverPage: false,
  header: false,
  footer: true,
  logo: true,
  watermark: false,
  pageNumbers: true,
  orientation: "portrait",
  font: "Inter",
  themeColors: DEFAULT_THEME_COLORS,
};

export async function getInvoiceRenderContext(
  invoiceId: string
): Promise<{ context: InvoiceRenderContext } | null> {
  const invoice = await invoiceService.getById(invoiceId);
  if (!invoice) return null;

  const [builder, template] = await Promise.all([
    builderService.getById(invoice.builderId),
    invoice.templateId ? templateService.getById(invoice.templateId) : Promise.resolve(null),
  ]);

  const gstBranch = builder?.gstBranches.find((b) => b.id === invoice.gstBranchId) ?? null;

  const context: InvoiceRenderContext = {
    invoice,
    builderName: builder?.companyName ?? "Unknown Builder",
    builderPan: builder?.pan ?? "",
    gstBranch,
    bankDetails: builder?.bankDetails ?? null,
    layout: template?.layout ?? DEFAULT_INVOICE_LAYOUT,
  };

  return { context };
}
