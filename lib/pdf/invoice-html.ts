import type { Invoice, GstBranch, TemplateLayout } from "@/types";
import { formatDate } from "@/lib/utils";
import { amountInWords } from "@/lib/gst/amount-in-words";

export interface InvoiceRenderContext {
  invoice: Invoice;
  builderName: string;
  builderPan: string;
  gstBranch: GstBranch | null;
  bankDetails: { accountName: string; accountNumber: string; ifsc: string; bankName: string; branch: string } | null;
  layout: TemplateLayout;
}

const DOC_TYPE_LABEL: Record<Invoice["docType"], string> = {
  tax_invoice: "Tax Invoice",
  proforma_invoice: "Proforma Invoice",
  credit_note: "Credit Note",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildInvoiceHtmlDocument(ctx: InvoiceRenderContext): string {
  const { invoice, builderName, builderPan, gstBranch, bankDetails, layout } = ctx;
  const { totals, currency } = invoice;
  const money = (v: number) => formatMoney(v, currency);
  const pageSizeCss = layout.orientation === "landscape" ? "11in 8.5in" : "8.5in 11in";

  const lineItemsRows = invoice.lineItems
    .map((item, index) => {
      const gross = item.quantity * item.rate;
      const discount = gross * (item.discountPercent / 100);
      const taxable = gross - discount;
      const taxAmount = taxable * (item.taxRatePercent / 100);
      const taxLabel = totals.isInterState
        ? `IGST ${item.taxRatePercent}%: ${money(taxAmount)}`
        : `CGST ${item.taxRatePercent / 2}% + SGST ${item.taxRatePercent / 2}%: ${money(taxAmount)}`;
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${escapeHtml(item.hsnSac)}</td>
        <td>${item.quantity} ${escapeHtml(item.unit)}</td>
        <td>${money(item.rate)}</td>
        <td>${item.discountPercent}%</td>
        <td>${money(taxable)}</td>
        <td>${taxLabel}</td>
        <td>${money(taxable + taxAmount)}</td>
      </tr>`;
    })
    .join("");

  const taxBreakupRows = totals.taxBreakup
    .map((b) =>
      totals.isInterState
        ? `<tr><th>IGST @ ${b.taxRatePercent}% on ${money(b.taxableValue)}</th><td>${money(b.igst)}</td></tr>`
        : `<tr><th>CGST + SGST @ ${b.taxRatePercent}% on ${money(b.taxableValue)}</th><td>${money(b.cgst + b.sgst)}</td></tr>`
    )
    .join("");

  const gstBranchBlock = gstBranch
    ? `<p>GSTIN: <strong>${escapeHtml(gstBranch.gstin)}</strong> (${escapeHtml(gstBranch.state)})</p>
       <p>${escapeHtml(gstBranch.address)}</p>`
    : `<p class="muted">No GSTIN registration selected for this invoice.</p>`;

  const bankBlock = bankDetails
    ? `<section class="invoice-section">
        <h2>Bank Details</h2>
        <div class="section-body">
          <p>${escapeHtml(bankDetails.accountName)} — ${escapeHtml(bankDetails.bankName)}, ${escapeHtml(bankDetails.branch)}</p>
          <p>A/C No: ${escapeHtml(bankDetails.accountNumber)} &nbsp;·&nbsp; IFSC: ${escapeHtml(bankDetails.ifsc)}</p>
        </div>
      </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(invoice.invoiceNumber)}</title>
<style>
  @page { size: ${pageSizeCss}; margin: 0.6in; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "${layout.font}", "Inter", -apple-system, sans-serif;
    color: ${layout.themeColors.text};
    background: ${layout.themeColors.background};
  }
  .doc-wrapper { max-width: 860px; margin: 0 auto; padding: 32px 40px 64px; }
  .letterhead {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid ${layout.themeColors.primary}; padding-bottom: 16px; margin-bottom: 20px;
  }
  .letterhead .company { font-size: 18px; font-weight: 800; color: ${layout.themeColors.secondary}; margin: 0 0 4px; }
  .letterhead .meta p { margin: 2px 0; font-size: 11.5px; color: #4b5563; }
  .doc-badge {
    display: inline-block; background: ${layout.themeColors.accent}22; color: ${layout.themeColors.accent};
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 4px 10px; border-radius: 999px; margin-bottom: 8px;
  }
  .doc-title { text-align: right; }
  .doc-title h1 { font-size: 22px; margin: 0 0 6px; color: ${layout.themeColors.primary}; }
  .doc-title p { margin: 2px 0; font-size: 12px; color: #4b5563; }
  .bill-to { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
  .bill-to h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin: 0 0 6px; }
  .bill-to p { margin: 2px 0; font-size: 12.5px; }
  .muted { color: #9ca3af; }
  table.line-items { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 16px; }
  table.line-items th, table.line-items td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; vertical-align: top; }
  table.line-items th { background: #f9fafb; font-weight: 600; }
  .totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  table.totals { border-collapse: collapse; font-size: 12.5px; min-width: 320px; }
  table.totals th, table.totals td { padding: 5px 10px; text-align: right; }
  table.totals th { text-align: left; font-weight: 500; color: #4b5563; }
  table.totals tr.grand-total th, table.totals tr.grand-total td {
    font-size: 15px; font-weight: 800; color: ${layout.themeColors.primary};
    border-top: 2px solid ${layout.themeColors.primary}; padding-top: 8px;
  }
  .amount-words { font-size: 11.5px; font-style: italic; color: #4b5563; text-align: right; margin-top: 4px; }
  .invoice-section { margin-bottom: 20px; break-inside: avoid; }
  .invoice-section h2 {
    font-size: 13px; font-weight: 700; color: ${layout.themeColors.primary};
    border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin: 0 0 8px;
  }
  .section-body { font-size: 12px; line-height: 1.6; }
  .signature-line { margin-top: 48px; display: flex; justify-content: flex-end; }
  .signature-line div { text-align: center; border-top: 1px solid #9ca3af; padding-top: 6px; width: 220px; font-size: 11.5px; color: #4b5563; }
  .invoice-footer { display: flex; justify-content: space-between; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 32px; }
</style>
</head>
<body>
  <div class="doc-wrapper">
    <div class="letterhead">
      <div class="company">
        <p class="company">${escapeHtml(builderName)}</p>
        <div class="meta">
          ${gstBranchBlock}
          ${builderPan ? `<p>PAN: ${escapeHtml(builderPan)}</p>` : ""}
        </div>
      </div>
      <div class="doc-title">
        <div class="doc-badge">${escapeHtml(DOC_TYPE_LABEL[invoice.docType])}</div>
        <h1>${escapeHtml(invoice.invoiceNumber)}</h1>
        <p>Issue Date: ${formatDate(invoice.issueDate)}</p>
        <p>Due Date: ${formatDate(invoice.dueDate)}</p>
      </div>
    </div>

    <div class="bill-to">
      <div>
        <h3>Bill To</h3>
        <p><strong>${escapeHtml(invoice.billTo.companyName || invoice.billTo.name)}</strong></p>
        ${invoice.billTo.name && invoice.billTo.companyName ? `<p>${escapeHtml(invoice.billTo.name)}</p>` : ""}
        <p>${escapeHtml(invoice.billTo.address)}</p>
        ${invoice.billTo.gstin ? `<p>GSTIN: ${escapeHtml(invoice.billTo.gstin)}</p>` : `<p class="muted">Unregistered / no GSTIN on file</p>`}
      </div>
      <div>
        <h3>Place of Supply</h3>
        <p>${escapeHtml(invoice.billTo.state || "—")}</p>
        <h3 style="margin-top:12px;">Supply Type</h3>
        <p>${totals.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}</p>
      </div>
    </div>

    <table class="line-items">
      <thead>
        <tr>
          <th>#</th><th>Description</th><th>HSN/SAC</th><th>Qty</th><th>Rate</th>
          <th>Disc.</th><th>Taxable Value</th><th>Tax</th><th>Total</th>
        </tr>
      </thead>
      <tbody>${lineItemsRows}</tbody>
    </table>

    <div class="totals-wrap">
      <div>
        <table class="totals">
          <tbody>
            <tr><th>Subtotal</th><td>${money(totals.subtotal)}</td></tr>
            <tr><th>Discount</th><td>-${money(totals.totalDiscount)}</td></tr>
            <tr><th>Taxable Value</th><td>${money(totals.taxableValue)}</td></tr>
            ${taxBreakupRows}
            <tr class="grand-total"><th>Grand Total</th><td>${money(totals.grandTotal)}</td></tr>
          </tbody>
        </table>
        <p class="amount-words">${amountInWords(totals.grandTotal, currency === "INR" ? "Rupees" : currency)}</p>
      </div>
    </div>

    ${bankBlock}

    ${
      invoice.notes
        ? `<section class="invoice-section"><h2>Notes</h2><div class="section-body">${escapeHtml(invoice.notes)}</div></section>`
        : ""
    }
    ${
      invoice.termsAndConditions
        ? `<section class="invoice-section"><h2>Terms &amp; Conditions</h2><div class="section-body">${escapeHtml(invoice.termsAndConditions)}</div></section>`
        : ""
    }

    <div class="signature-line">
      <div>Authorized Signatory<br />${escapeHtml(builderName)}</div>
    </div>

    <div class="invoice-footer">
      <span>${escapeHtml(invoice.billTo.address)}</span>
      <span>Generated by BuildReport AI</span>
    </div>
  </div>
</body>
</html>`;
}
