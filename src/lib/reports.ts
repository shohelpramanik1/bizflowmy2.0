import { and, eq, gte, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, expenses, invoiceItems, invoices, payments, quotations } from "@/db/schema";

export type Range = { from: string; to: string };

export function rangeForPreset(preset: string): Range {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  switch (preset) {
    case "today":
      return { from: iso(now), to: iso(now) };
    case "week": {
      const day = now.getUTCDay() || 7;
      const start = new Date(Date.UTC(y, m, now.getUTCDate() - day + 1));
      return { from: iso(start), to: iso(now) };
    }
    case "month":
      return { from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))) };
    case "quarter": {
      const qs = Math.floor(m / 3) * 3;
      return { from: iso(new Date(Date.UTC(y, qs, 1))), to: iso(new Date(Date.UTC(y, qs + 3, 0))) };
    }
    case "year":
    default:
      return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

export async function financialSummary(businessId: number, range: Range) {
  const active = [eq(invoices.businessId, businessId), eq(invoices.archived, false), ne(invoices.status, "draft"), ne(invoices.status, "cancelled")];

  const [totals] = await db
    .select({
      invoiceCount: sql<number>`COUNT(*)::int`,
      totalBilled: sql<number>`COALESCE(SUM(${invoices.totalCents}),0)::int`,
      totalPaid: sql<number>`COALESCE(SUM(${invoices.paidCents}),0)::int`,
      outstanding: sql<number>`COALESCE(SUM(GREATEST(${invoices.totalCents} - ${invoices.paidCents},0)),0)::int`,
      paidCount: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'paid')::int`,
      unpaidCount: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} IN ('sent','viewed','partially_paid'))::int`,
      overdueCount: sql<number>`COUNT(*) FILTER (WHERE ${invoices.status} = 'overdue')::int`,
      overdueAmount: sql<number>`COALESCE(SUM(${invoices.totalCents} - ${invoices.paidCents}) FILTER (WHERE ${invoices.status} = 'overdue'),0)::int`,
    })
    .from(invoices)
    .where(and(...active, gte(invoices.issueDate, range.from), lte(invoices.issueDate, range.to)));

  const [exp] = await db
    .select({ total: sql<number>`COALESCE(SUM(${expenses.amountCents} + ${expenses.taxCents}),0)::int`, n: sql<number>`COUNT(*)::int` })
    .from(expenses)
    .where(and(eq(expenses.businessId, businessId), gte(expenses.expenseDate, range.from), lte(expenses.expenseDate, range.to)));

  const [collected] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amountCents}),0)::int` })
    .from(payments)
    .where(and(eq(payments.businessId, businessId), gte(payments.paidAt, range.from), lte(payments.paidAt, range.to)));

  const [quo] = await db
    .select({
      n: sql<number>`COUNT(*)::int`,
      accepted: sql<number>`COUNT(*) FILTER (WHERE ${quotations.status} IN ('accepted','converted'))::int`,
      value: sql<number>`COALESCE(SUM(${quotations.totalCents}),0)::int`,
    })
    .from(quotations)
    .where(and(eq(quotations.businessId, businessId), eq(quotations.archived, false), gte(quotations.issueDate, range.from), lte(quotations.issueDate, range.to)));

  const revenue = totals?.totalBilled ?? 0;
  const expenseTotal = exp?.total ?? 0;

  return {
    revenue,
    collected: collected?.total ?? 0,
    outstanding: totals?.outstanding ?? 0,
    overdueAmount: totals?.overdueAmount ?? 0,
    expenses: expenseTotal,
    expenseCount: exp?.n ?? 0,
    netProfit: revenue - expenseTotal,
    invoiceCount: totals?.invoiceCount ?? 0,
    paidCount: totals?.paidCount ?? 0,
    unpaidCount: totals?.unpaidCount ?? 0,
    overdueCount: totals?.overdueCount ?? 0,
    quotationCount: quo?.n ?? 0,
    quotationAccepted: quo?.accepted ?? 0,
    quotationValue: quo?.value ?? 0,
    conversionRate: quo?.n ? Math.round(((quo.accepted ?? 0) / quo.n) * 100) : 0,
  };
}

export async function monthlySeries(businessId: number, year: number) {
  const rev = await db
    .select({ m: sql<number>`EXTRACT(MONTH FROM ${invoices.issueDate})::int`, total: sql<number>`COALESCE(SUM(${invoices.totalCents}),0)::int` })
    .from(invoices)
    .where(and(eq(invoices.businessId, businessId), eq(invoices.archived, false), ne(invoices.status, "draft"), ne(invoices.status, "cancelled"), sql`EXTRACT(YEAR FROM ${invoices.issueDate}) = ${year}`))
    .groupBy(sql`1`);

  const exp = await db
    .select({ m: sql<number>`EXTRACT(MONTH FROM ${expenses.expenseDate})::int`, total: sql<number>`COALESCE(SUM(${expenses.amountCents} + ${expenses.taxCents}),0)::int` })
    .from(expenses)
    .where(and(eq(expenses.businessId, businessId), sql`EXTRACT(YEAR FROM ${expenses.expenseDate}) = ${year}`))
    .groupBy(sql`1`);

  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels.map((label, i) => {
    const revenue = rev.find((r) => r.m === i + 1)?.total ?? 0;
    const expense = exp.find((r) => r.m === i + 1)?.total ?? 0;
    return { label, revenue, expense, profit: revenue - expense };
  });
}

export async function invoiceStatusBreakdown(businessId: number) {
  const rows = await db
    .select({ status: invoices.status, n: sql<number>`COUNT(*)::int`, amount: sql<number>`COALESCE(SUM(${invoices.totalCents}),0)::int` })
    .from(invoices)
    .where(and(eq(invoices.businessId, businessId), eq(invoices.archived, false)))
    .groupBy(invoices.status);
  return rows;
}

export async function expenseByCategory(businessId: number, range: Range) {
  return db
    .select({ category: expenses.category, total: sql<number>`COALESCE(SUM(${expenses.amountCents} + ${expenses.taxCents}),0)::int`, n: sql<number>`COUNT(*)::int` })
    .from(expenses)
    .where(and(eq(expenses.businessId, businessId), gte(expenses.expenseDate, range.from), lte(expenses.expenseDate, range.to)))
    .groupBy(expenses.category)
    .orderBy(sql`2 DESC`);
}

export async function topCustomers(businessId: number, range: Range, limit = 10) {
  return db
    .select({
      id: customers.id,
      name: customers.name,
      company: customers.companyName,
      revenue: sql<number>`COALESCE(SUM(${invoices.totalCents}),0)::int`,
      paid: sql<number>`COALESCE(SUM(${invoices.paidCents}),0)::int`,
      invoices: sql<number>`COUNT(${invoices.id})::int`,
    })
    .from(customers)
    .leftJoin(
      invoices,
      and(eq(invoices.customerId, customers.id), eq(invoices.archived, false), ne(invoices.status, "draft"), gte(invoices.issueDate, range.from), lte(invoices.issueDate, range.to)),
    )
    .where(and(eq(customers.businessId, businessId), eq(customers.archived, false)))
    .groupBy(customers.id, customers.name, customers.companyName)
    .orderBy(sql`4 DESC`)
    .limit(limit);
}

export async function topProducts(businessId: number, range: Range, limit = 10) {
  return db
    .select({
      name: invoiceItems.name,
      qty: sql<number>`COALESCE(SUM(${invoiceItems.quantity}),0)::int`,
      revenue: sql<number>`COALESCE(SUM(${invoiceItems.lineTotalCents}),0)::int`,
    })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
    .where(and(eq(invoices.businessId, businessId), eq(invoices.archived, false), ne(invoices.status, "draft"), gte(invoices.issueDate, range.from), lte(invoices.issueDate, range.to)))
    .groupBy(invoiceItems.name)
    .orderBy(sql`3 DESC`)
    .limit(limit);
}

export function toCsv(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}
