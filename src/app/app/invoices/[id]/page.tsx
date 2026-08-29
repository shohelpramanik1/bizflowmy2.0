import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, payments, quotations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { loadInvoiceWithItems, statusLabel, statusTone } from "@/lib/documents";
import { can } from "@/lib/rbac";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, CardHeader } from "@/components/ui";
import DocumentPreview from "@/components/document-preview";
import DocumentActions from "@/components/document-actions";

export const dynamic = "force-dynamic";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.business) return null;
  const { id } = await params;

  let data;
  try {
    data = await loadInvoiceWithItems(session.businessId, Number(id));
  } catch {
    notFound();
  }
  const { invoice, items } = data;
  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
  const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, invoice.id)).orderBy(payments.paidAt);
  const sourceQuote = invoice.quotationId ? (await db.select().from(quotations).where(eq(quotations.id, invoice.quotationId)).limit(1))[0] : null;
  const b = session.business;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app/invoices" className="text-xs font-semibold text-slate-500 hover:text-brand-700">← Back to invoices</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            {invoice.number}
            <Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
            {sourceQuote && (
              <Link href={`/app/quotations/${sourceQuote.id}`} className="text-xs font-semibold text-brand-700 hover:underline">
                from {sourceQuote.number}
              </Link>
            )}
          </h1>
        </div>
        <DocumentActions
          kind="invoice"
          docId={invoice.id}
          number={invoice.number}
          status={invoice.status}
          totalCents={invoice.totalCents}
          paidCents={invoice.paidCents}
          symbol={b.currencySymbol}
          customerPhone={customer?.whatsapp ?? customer?.phone ?? null}
          customerName={customer?.name ?? "Customer"}
          canWrite={can(session.role, "invoices.write")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <DocumentPreview
          title="Invoice"
          template={b.invoiceTemplate}
          business={b}
          customer={customer ?? null}
          number={invoice.number}
          primaryDate={invoice.issueDate}
          primaryDateLabel="Issue date"
          secondaryDate={invoice.dueDate}
          secondaryDateLabel="Due date"
          items={items}
          subtotalCents={invoice.subtotalCents}
          discountCents={invoice.discountCents}
          taxCents={invoice.taxCents}
          totalCents={invoice.totalCents}
          paidCents={invoice.paidCents}
          notes={invoice.notes}
          terms={invoice.paymentTerms}
          bankInfo={invoice.bankInfo}
          status={invoice.status}
        />

        <div className="no-print space-y-4">
          <Card>
            <CardHeader title="Payment history" subtitle={`${paymentRows.length} payment(s) recorded`} />
            {paymentRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {paymentRows.map((p) => (
                  <li key={p.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-emerald-700">{formatMoney(p.amountCents, b.currencySymbol)}</span>
                      <span className="text-xs text-slate-400">{formatDate(p.paidAt)}</span>
                    </div>
                    <p className="text-xs capitalize text-slate-500">{p.method.replace("_", " ")}{p.reference ? ` · ${p.reference}` : ""}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Collection progress</p>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                style={{ width: `${invoice.totalCents > 0 ? Math.min(100, (invoice.paidCents / invoice.totalCents) * 100) : 0}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-emerald-700">Paid {formatMoney(invoice.paidCents, b.currencySymbol)}</span>
              <span className="text-amber-700">Due {formatMoney(invoice.totalCents - invoice.paidCents, b.currencySymbol)}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
