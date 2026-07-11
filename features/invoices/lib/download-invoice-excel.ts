import { downloadInvoiceExcel as writeExcelDownload } from "@/lib/export/invoice-excel-export";
import { slugify } from "@/lib/utils";
import { invoiceService } from "@/services";

export async function downloadInvoiceExcel(invoiceId: string): Promise<void> {
  const invoice = await invoiceService.getById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  await writeExcelDownload(invoice, slugify(invoice.invoiceNumber));
}
