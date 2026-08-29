import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loadInvoiceWithItems } from "@/lib/documents";
import { PageHeader } from "@/components/page-header";
import DocumentForm from "@/components/document-form";

export const dynamic = "force-dynamic";

export default async function EditInvoice({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.business) return null;
  const { id } = await params;
  let data;
  try {
    data = await loadInvoiceWithItems(session.businessId, Number(id));
  } catch {
    notFound();
  }
  const b = session.business;
  return (
    <div>
      <PageHeader
        title={`Edit ${data.invoice.number}`}
        subtitle={data.invoice.paidCents > 0 ? "This invoice has payments — line items are locked." : "Changes are recorded in the audit trail."}
      />
      <DocumentForm
        kind="invoice"
        docId={data.invoice.id}
        symbol={b.currencySymbol}
        defaultTaxBp={b.taxEnabled ? b.taxRateBp : 0}
        defaultTerms={data.invoice.paymentTerms ?? b.defaultPaymentTerms ?? ""}
        defaultNotes={data.invoice.notes ?? ""}
        paymentTermDays={b.paymentTermDays}
        existing={{
          customerId: data.invoice.customerId,
          issueDate: data.invoice.issueDate,
          secondDate: data.invoice.dueDate,
          notes: data.invoice.notes ?? "",
          terms: data.invoice.paymentTerms ?? "",
          items: data.items,
        }}
      />
    </div>
  );
}
