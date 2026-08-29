import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import DocumentForm from "@/components/document-form";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const session = await getSession();
  const b = session?.business;
  return (
    <div>
      <PageHeader title="New quotation" subtitle="Line totals, discounts and tax are recalculated securely on the server." />
      <DocumentForm
        kind="quotation"
        symbol={b?.currencySymbol ?? "RM"}
        defaultTaxBp={b?.taxEnabled ? b.taxRateBp : 0}
        defaultTerms={b?.quotationTerms ?? "This quotation is valid for 14 days from the issue date."}
        defaultNotes=""
        paymentTermDays={b?.paymentTermDays ?? 30}
      />
    </div>
  );
}
