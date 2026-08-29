import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, customers, emailLogs, invoices, quotations, tasks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { formatDate, formatDateTime, formatMoney, normalizeMsisdn, today } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/documents";
import { PageHeader, StatCard } from "@/components/page-header";
import { Badge, Card, CardHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.business) return null;
  const { id } = await params;
  const bid = session.businessId;
  const sym = session.business.currencySymbol;

  const [customer] = await db.select().from(customers).where(and(eq(customers.id, Number(id)), eq(customers.businessId, bid))).limit(1);
  if (!customer) notFound();

  const [quotes, invs, custTasks, custBookings, comms] = await Promise.all([
    db.select().from(quotations).where(and(eq(quotations.businessId, bid), eq(quotations.customerId, customer.id))).orderBy(desc(quotations.id)).limit(20),
    db.select().from(invoices).where(and(eq(invoices.businessId, bid), eq(invoices.customerId, customer.id))).orderBy(desc(invoices.id)).limit(20),
    db.select().from(tasks).where(and(eq(tasks.businessId, bid), eq(tasks.customerId, customer.id))).orderBy(desc(tasks.id)).limit(20),
    db.select().from(bookings).where(and(eq(bookings.businessId, bid), eq(bookings.customerId, customer.id), gte(bookings.bookingDate, today()))).limit(5),
    db.select().from(emailLogs).where(and(eq(emailLogs.businessId, bid), eq(emailLogs.customerId, customer.id))).orderBy(desc(emailLogs.createdAt)).limit(10),
  ]);

  const [agg] = await db
    .select({
      billed: sql<number>`COALESCE(SUM(${invoices.totalCents}) FILTER (WHERE ${invoices.status} NOT IN ('draft','cancelled')),0)::int`,
      paid: sql<number>`COALESCE(SUM(${invoices.paidCents}),0)::int`,
      outstanding: sql<number>`COALESCE(SUM(${invoices.totalCents} - ${invoices.paidCents}) FILTER (WHERE ${invoices.status} NOT IN ('draft','cancelled','paid')),0)::int`,
      overdue: sql<number>`COALESCE(SUM(${invoices.totalCents} - ${invoices.paidCents}) FILTER (WHERE ${invoices.status} = 'overdue'),0)::int`,
    })
    .from(invoices)
    .where(and(eq(invoices.businessId, bid), eq(invoices.customerId, customer.id), eq(invoices.archived, false)));

  const waNumber = normalizeMsisdn(customer.whatsapp ?? customer.phone);

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer.name}
        subtitle={[customer.companyName, customer.email, customer.phone].filter(Boolean).join(" · ")}
        action={
          <>
            <Link href="/app/customers" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">← Customers</Link>
            {waNumber && (
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">💬 WhatsApp</a>
            )}
            <Link href="/app/quotations/new" className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">+ New quotation</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total billed" value={formatMoney(agg?.billed ?? 0, sym)} hint={`${invs.length} invoices`} tone="brand" />
        <StatCard label="Total paid" value={formatMoney(agg?.paid ?? 0, sym)} tone="emerald" />
        <StatCard label="Outstanding" value={formatMoney(agg?.outstanding ?? 0, sym)} tone="amber" />
        <StatCard label="Overdue" value={formatMoney(agg?.overdue ?? 0, sym)} tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Customer details" />
          <dl className="space-y-2 p-4 text-sm">
            {[
              ["Company", customer.companyName], ["Email", customer.email], ["Phone", customer.phone],
              ["WhatsApp", customer.whatsapp], ["Address", customer.address],
              ["City", customer.city], ["State", customer.state], ["Postcode", customer.postcode],
              ["Country", customer.country], ["Tax / SSM no.", customer.taxNo], ["Notes", customer.notes],
            ].map(([k, v]) => (
              <div key={k as string} className="flex gap-2">
                <dt className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
                <dd className="min-w-0 flex-1 break-words text-slate-700">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Invoices" action={<Link href="/app/invoices" className="text-xs font-semibold text-brand-700 hover:underline">All</Link>} />
            {invs.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-400">No invoices yet.</p> : (
              <ul className="divide-y divide-slate-100">
                {invs.map((i) => (
                  <li key={i.id}>
                    <Link href={`/app/invoices/${i.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <span className="font-semibold text-brand-700">{i.number}</span>
                      <span className="text-xs text-slate-400">{formatDate(i.issueDate)}</span>
                      <span className="ml-auto font-bold text-slate-900">{formatMoney(i.totalCents, sym)}</span>
                      <Badge tone={statusTone(i.status)}>{statusLabel(i.status)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Quotations" />
            {quotes.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-400">No quotations yet.</p> : (
              <ul className="divide-y divide-slate-100">
                {quotes.map((q) => (
                  <li key={q.id}>
                    <Link href={`/app/quotations/${q.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                      <span className="font-semibold text-brand-700">{q.number}</span>
                      <span className="text-xs text-slate-400">{formatDate(q.issueDate)}</span>
                      <span className="ml-auto font-bold text-slate-900">{formatMoney(q.totalCents, sym)}</span>
                      <Badge tone={statusTone(q.status)}>{statusLabel(q.status)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Related tasks" action={<Link href="/app/tasks" className="text-xs font-semibold text-brand-700 hover:underline">Manage</Link>} />
          {custTasks.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-400">No tasks linked.</p> : (
            <ul className="divide-y divide-slate-100">
              {custTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{t.title}</span>
                  <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Upcoming bookings" />
          {custBookings.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-400">No upcoming bookings.</p> : (
            <ul className="divide-y divide-slate-100">
              {custBookings.map((b) => (
                <li key={b.id} className="px-4 py-2.5 text-sm">
                  <p className="font-medium text-slate-800">{formatDate(b.bookingDate)} · {b.startTime}</p>
                  <p className="text-xs text-slate-500">{b.serviceName ?? "Appointment"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Communication history" />
          {comms.length === 0 ? <p className="px-4 py-6 text-center text-sm text-slate-400">No messages sent yet.</p> : (
            <ul className="divide-y divide-slate-100">
              {comms.map((c) => (
                <li key={c.id} className="px-4 py-2.5">
                  <p className="truncate text-sm font-medium text-slate-800">{c.subject}</p>
                  <p className="text-[11px] text-slate-400">{c.channel} · {formatDateTime(c.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
