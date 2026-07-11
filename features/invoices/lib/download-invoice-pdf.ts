import { buildInvoiceHtmlDocument } from "@/lib/pdf/invoice-html";
import { slugify } from "@/lib/utils";
import { getInvoiceRenderContext } from "./build-invoice-context";

export async function downloadInvoicePdf(invoiceId: string): Promise<void> {
  const result = await getInvoiceRenderContext(invoiceId);
  if (!result) throw new Error("Invoice not found");

  const html = buildInvoiceHtmlDocument(result.context);
  const filename = slugify(result.context.invoice.invoiceNumber);
  const res = await fetch("/api/reports/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      html,
      orientation: result.context.layout.orientation,
      pageNumbers: result.context.layout.pageNumbers,
      filename,
    }),
  });

  if (!res.ok) throw new Error("Failed to generate PDF");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
