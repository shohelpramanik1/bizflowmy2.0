import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import DocumentForm from "@/components/document-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const session = await getSession();
  const b = session?.business;
  return (
    <div>
      <PageHeader title="New invoice" subtitle="Totals are calculated server-side and locked once the invoice is sent." />
      <DocumentForm
        kind="invoice"
        symbol={b?.currencySymbol ?? "RM"}
        defaultTaxBp={b?.taxEnabled ? b.taxRateBp : 0}
        defaultTerms={b?.defaultPaymentTerms ?? "Payment due within 30 days"}
        defaultNotes={b?.invoiceNotes ?? ""}
        paymentTermDays={b?.paymentTermDays ?? 30}
      />
    </div>
  );
}
