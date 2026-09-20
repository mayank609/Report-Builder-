import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceGeneratorForm } from "@/features/invoices/components/invoice-generator-form";

export default function NewInvoicePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link
          href="/invoices"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Invoices
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          New Invoice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GST is calculated automatically — CGST + SGST for same-state supply, IGST across states.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <InvoiceGeneratorForm />
      </Suspense>
    </div>
  );
}
