import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loadQuotationWithItems } from "@/lib/documents";
import { PageHeader } from "@/components/page-header";
import DocumentForm from "@/components/document-form";

export const dynamic = "force-dynamic";

export default async function EditQuotation({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.business) return null;
  const { id } = await params;
  let data;
  try {
    data = await loadQuotationWithItems(session.businessId, Number(id));
  } catch {
    notFound();
  }
  const b = session.business;
  return (
    <div>
      <PageHeader title={`Edit ${data.quotation.number}`} subtitle="Changes are recorded in the activity log." />
      <DocumentForm
        kind="quotation"
        docId={data.quotation.id}
        symbol={b.currencySymbol}
        defaultTaxBp={b.taxEnabled ? b.taxRateBp : 0}
        defaultTerms={b.quotationTerms ?? ""}
        defaultNotes=""
        paymentTermDays={b.paymentTermDays}
        existing={{
          customerId: data.quotation.customerId,
          issueDate: data.quotation.issueDate,
          secondDate: data.quotation.expiryDate ?? data.quotation.issueDate,
          notes: data.quotation.notes ?? "",
          terms: data.quotation.terms ?? "",
          items: data.items,
        }}
      />
    </div>
  );
}
