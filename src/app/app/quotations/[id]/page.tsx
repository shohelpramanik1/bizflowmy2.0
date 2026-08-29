import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { loadQuotationWithItems, statusLabel, statusTone } from "@/lib/documents";
import { can } from "@/lib/rbac";
import { Badge } from "@/components/ui";
import DocumentPreview from "@/components/document-preview";
import DocumentActions from "@/components/document-actions";

export const dynamic = "force-dynamic";

export default async function QuotationDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.business) return null;
  const { id } = await params;

  let data;
  try {
    data = await loadQuotationWithItems(session.businessId, Number(id));
  } catch {
    notFound();
  }
  const { quotation, items } = data;
  const [customer] = await db.select().from(customers).where(eq(customers.id, quotation.customerId)).limit(1);
  const b = session.business;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/quotations" className="text-xs font-semibold text-slate-500 hover:text-brand-700">← Back to quotations</Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {quotation.number}
            <Badge tone={statusTone(quotation.status)}>{statusLabel(quotation.status)}</Badge>
          </h1>
        </div>
        <DocumentActions
          kind="quotation"
          docId={quotation.id}
          number={quotation.number}
          status={quotation.status}
          totalCents={quotation.totalCents}
          symbol={b.currencySymbol}
          customerPhone={customer?.whatsapp ?? customer?.phone ?? null}
          customerName={customer?.name ?? "Customer"}
          converted={quotation.convertedInvoiceId}
          canWrite={can(session.role, "quotations.write")}
        />
      </div>

      {quotation.status === "accepted" && !quotation.convertedInvoiceId && (
        <div className="no-print flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-sm font-semibold text-emerald-800">🎉 This quotation was accepted — ready to bill?</span>
          <span className="text-xs text-emerald-700">Use “Convert to invoice” above. The original quotation is always preserved.</span>
        </div>
      )}

      <DocumentPreview
        title="Quotation"
        template={b.quotationTemplate}
        business={b}
        customer={customer ?? null}
        number={quotation.number}
        primaryDate={quotation.issueDate}
        primaryDateLabel="Issue date"
        secondaryDate={quotation.expiryDate}
        secondaryDateLabel="Valid until"
        items={items}
        subtotalCents={quotation.subtotalCents}
        discountCents={quotation.discountCents}
        taxCents={quotation.taxCents}
        totalCents={quotation.totalCents}
        notes={quotation.notes}
        terms={quotation.terms}
        status={quotation.status}
      />
    </div>
  );
}
