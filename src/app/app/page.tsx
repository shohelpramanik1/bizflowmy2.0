import Link from "next/link";
import { and, desc, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, bookings, customers, invoices, tasks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { financialSummary, invoiceStatusBreakdown, monthlySeries, rangeForPreset } from "@/lib/reports";
import { formatCompact, formatDate, formatDateTime, formatMoney, today } from "@/lib/format";
import { statusTone, statusLabel } from "@/lib/documents";
import { PageHeader, StatCard } from "@/components/page-header";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { DashboardCharts } from "./dashboard-charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ preset?: string }> }) {
  const session = await getSession();
  if (!session?.business) return null;
  const { preset = "year" } = await searchParams;
  const bid = session.businessId;
  const sym = session.business.currencySymbol;
  const range = rangeForPreset(preset);
  const year = new Date().getUTCFullYear();

  const [summary, monthly, statuses, todayS, weekS, monthS, recentInvoices, upcoming, openTasks, activity] = await Promise.all([
    financialSummary(bid, range),
    monthlySeries(bid, year),
    invoiceStatusBreakdown(bid),
    financialSummary(bid, rangeForPreset("today")),
    financialSummary(bid, rangeForPreset("week")),
    financialSummary(bid, rangeForPreset("month")),
    db
      .select({ invoice: invoices, customerName: customers.name })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(and(eq(invoices.businessId, bid), eq(invoices.archived, false)))
      .orderBy(desc(invoices.id))
      .limit(6),
    db
      .select()
      .from(bookings)
      .where(and(eq(bookings.businessId, bid), gte(bookings.bookingDate, today()), ne(bookings.status, "cancelled")))
      .orderBy(bookings.bookingDate, bookings.startTime)
      .limit(5),
    db
      .select({ task: tasks, customerName: customers.name })
      .from(tasks)
      .leftJoin(customers, eq(customers.id, tasks.customerId))
      .where(and(eq(tasks.businessId, bid), ne(tasks.status, "completed"), ne(tasks.status, "cancelled")))
      .orderBy(tasks.dueDate)
      .limit(6),
    db.select().from(activityLogs).where(eq(activityLogs.businessId, bid)).orderBy(desc(activityLogs.createdAt)).limit(8),
  ]);

  const [overdueNow] = await db
    .select({ n: sql<number>`COUNT(*)::int`, amount: sql<number>`COALESCE(SUM(${invoices.totalCents} - ${invoices.paidCents}),0)::int` })
    .from(invoices)
    .where(and(eq(invoices.businessId, bid), eq(invoices.status, "overdue"), eq(invoices.archived, false), lte(invoices.dueDate, today())));

  const presets = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "quarter", label: "Quarter" },
    { key: "year", label: "This year" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Selamat datang, ${session.user.name.split(" ")[0]} 👋`}
        subtitle={`${session.business.name} · ${formatDate(range.from)} → ${formatDate(range.to)}`}
        action={
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <Link
                key={p.key}
                href={`/app?preset=${p.key}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${preset === p.key ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total revenue" value={formatMoney(summary.revenue, sym)} hint={`${summary.invoiceCount} invoices issued`} tone="brand" />
        <StatCard label="Outstanding" value={formatMoney(summary.outstanding, sym)} hint={`${summary.unpaidCount} awaiting payment`} tone="amber" />
        <StatCard label="Overdue" value={formatMoney(overdueNow?.amount ?? 0, sym)} hint={`${overdueNow?.n ?? 0} invoices past due`} tone="rose" />
        <StatCard label="Expenses" value={formatMoney(summary.expenses, sym)} hint={`${summary.expenseCount} recorded`} tone="violet" />
        <StatCard label="Net profit" value={formatMoney(summary.netProfit, sym)} hint="Revenue − expenses" tone="emerald" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Today", data: todayS },
          { label: "This week", data: weekS },
          { label: "This month", data: monthS },
          { label: "This year", data: summary },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label} sales</p>
            <p className="mt-1 text-lg font-black text-slate-900">{formatMoney(s.data.revenue, sym)}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {s.data.invoiceCount} invoices · collected {formatCompact(s.data.collected, sym)}
            </p>
          </Card>
        ))}
      </div>

      <DashboardCharts
        monthly={monthly}
        statuses={statuses}
        symbol={sym}
        conversion={{ quotes: summary.quotationCount, accepted: summary.quotationAccepted, rate: summary.conversionRate, value: summary.quotationValue }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent invoices" action={<Link href="/app/invoices" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>} />
          {recentInvoices.length === 0 ? (
            <EmptyState title="No invoices yet" description="Create your first invoice to start tracking revenue." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentInvoices.map(({ invoice, customerName }) => (
                <li key={invoice.id}>
                  <Link href={`/app/invoices/${invoice.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{invoice.number}</p>
                      <p className="truncate text-xs text-slate-500">{customerName} · due {formatDate(invoice.dueDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatMoney(invoice.totalCents, sym)}</p>
                      <Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming bookings" action={<Link href="/app/bookings" className="text-xs font-semibold text-brand-700 hover:underline">All</Link>} />
            {upcoming.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No upcoming bookings.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {upcoming.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700">
                      <span>{new Date(`${b.bookingDate}T00:00:00Z`).toLocaleDateString("en-MY", { day: "2-digit", timeZone: "UTC" })}</span>
                      <span>{new Date(`${b.bookingDate}T00:00:00Z`).toLocaleDateString("en-MY", { month: "short", timeZone: "UTC" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{b.customerName}</p>
                      <p className="truncate text-xs text-slate-500">{b.startTime}–{b.endTime} · {b.serviceName ?? "Appointment"}</p>
                    </div>
                    <Badge tone={statusTone(b.status)}>{statusLabel(b.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Open tasks" action={<Link href="/app/tasks" className="text-xs font-semibold text-brand-700 hover:underline">All</Link>} />
            {openTasks.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Nothing outstanding. 🎉</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {openTasks.map(({ task, customerName }) => (
                  <li key={task.id} className="flex items-center gap-2 px-4 py-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${task.priority === "urgent" ? "bg-rose-500" : task.priority === "high" ? "bg-amber-500" : "bg-slate-300"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-800">{task.title}</p>
                      <p className="truncate text-xs text-slate-400">{customerName ?? "Internal"} · {task.dueDate ? formatDate(task.dueDate) : "No due date"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Team activity log" subtitle="Every important financial action is recorded" />
        {activity.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {activity.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                  {(a.userName ?? "SY").slice(0, 2).toUpperCase()}
                </span>
                <span className="text-slate-700"><strong className="font-semibold">{a.userName ?? "System"}</strong> {a.action}</span>
                <span className="ml-auto text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
