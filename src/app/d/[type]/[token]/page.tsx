import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, customers, invoiceItems, invoices, quotationItems, quotations } from "@/db/schema";
import DocumentPreview from "@/components/document-preview";
import PortalActions from "./portal-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your document", robots: { index: false, follow: false } };

export default async function PublicDocumentPage({ params }: { params: Promise<{ type: string; token: string }> }) {
  const { type, token } = await params;

  if (type === "q") {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.publicToken, token)).limit(1);
    if (!quotation) notFound();
    if (!quotation.viewedAt && quotation.status === "sent") {
      await db.update(quotations).set({ status: "viewed", viewedAt: new Date() }).where(eq(quotations.id, quotation.id));
    }
    const [business] = await db.select().from(businesses).where(eq(businesses.id, quotation.businessId)).limit(1);
    const [customer] = await db.select().from(customers).where(eq(customers.id, quotation.customerId)).limit(1);
    const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotation.id)).orderBy(quotationItems.sortOrder);

    return (
      <div className="min-h-screen bg-slate-100 px-3 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <PortalActions
            token={token}
            kind="quotation"
            decided={["accepted", "rejected", "converted"].includes(quotation.status)}
            status={quotation.status}
          />
          <DocumentPreview
            title="Quotation" template={business.quotationTemplate} business={business} customer={customer ?? null}
            number={quotation.number} primaryDate={quotation.issueDate} primaryDateLabel="Issue date"
            secondaryDate={quotation.expiryDate} secondaryDateLabel="Valid until" items={items}
            subtotalCents={quotation.subtotalCents} discountCents={quotation.discountCents}
            taxCents={quotation.taxCents} totalCents={quotation.totalCents}
            notes={quotation.notes} terms={quotation.terms} status={quotation.status}
          />
        </div>
      </div>
    );
  }

  const [invoice] = await db.select().from(invoices).where(eq(invoices.publicToken, token)).limit(1);
  if (!invoice) notFound();
  if (!invoice.viewedAt && invoice.status === "sent") {
    await db.update(invoices).set({ status: "viewed", viewedAt: new Date() }).where(eq(invoices.id, invoice.id));
  }
  const [business] = await db.select().from(businesses).where(eq(businesses.id, invoice.businessId)).limit(1);
  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)).orderBy(invoiceItems.sortOrder);

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <PortalActions token={token} kind="invoice" decided status={invoice.status} />
        <DocumentPreview
          title="Invoice" template={business.invoiceTemplate} business={business} customer={customer ?? null}
          number={invoice.number} primaryDate={invoice.issueDate} primaryDateLabel="Issue date"
          secondaryDate={invoice.dueDate} secondaryDateLabel="Due date" items={items}
          subtotalCents={invoice.subtotalCents} discountCents={invoice.discountCents}
          taxCents={invoice.taxCents} totalCents={invoice.totalCents} paidCents={invoice.paidCents}
          notes={invoice.notes} terms={invoice.paymentTerms} bankInfo={invoice.bankInfo} status={invoice.status}
        />
      </div>
    </div>
  );
}
