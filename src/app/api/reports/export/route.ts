import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { customers, expenses, invoices, payments, quotations } from "@/db/schema";
import { handleError, requireBusiness } from "@/lib/api";
import { fromCents } from "@/lib/format";
import { rangeForPreset, toCsv } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("reports.read");
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "invoices";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const range = from && to ? { from, to } : rangeForPreset(url.searchParams.get("preset") ?? "year");
    const bid = session.businessId;
    let rows: Record<string, string | number | null>[] = [];

    if (type === "invoices") {
      const data = await db
        .select({ inv: invoices, customer: customers.name })
        .from(invoices)
        .innerJoin(customers, eq(customers.id, invoices.customerId))
        .where(and(eq(invoices.businessId, bid), gte(invoices.issueDate, range.from), lte(invoices.issueDate, range.to)))
        .orderBy(desc(invoices.issueDate));
      rows = data.map((d) => ({
        Number: d.inv.number, Customer: d.customer, "Issue Date": d.inv.issueDate, "Due Date": d.inv.dueDate,
        Status: d.inv.status, Subtotal: fromCents(d.inv.subtotalCents), Discount: fromCents(d.inv.discountCents),
        Tax: fromCents(d.inv.taxCents), Total: fromCents(d.inv.totalCents), Paid: fromCents(d.inv.paidCents),
        Outstanding: fromCents(d.inv.totalCents - d.inv.paidCents),
      }));
    } else if (type === "quotations") {
      const data = await db
        .select({ q: quotations, customer: customers.name })
        .from(quotations)
        .innerJoin(customers, eq(customers.id, quotations.customerId))
        .where(and(eq(quotations.businessId, bid), gte(quotations.issueDate, range.from), lte(quotations.issueDate, range.to)))
        .orderBy(desc(quotations.issueDate));
      rows = data.map((d) => ({ Number: d.q.number, Customer: d.customer, "Issue Date": d.q.issueDate, Expiry: d.q.expiryDate, Status: d.q.status, Total: fromCents(d.q.totalCents) }));
    } else if (type === "payments") {
      const data = await db
        .select({ p: payments, invoice: invoices.number, customer: customers.name })
        .from(payments)
        .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
        .innerJoin(customers, eq(customers.id, payments.customerId))
        .where(and(eq(payments.businessId, bid), gte(payments.paidAt, range.from), lte(payments.paidAt, range.to)))
        .orderBy(desc(payments.paidAt));
      rows = data.map((d) => ({ Date: d.p.paidAt, Invoice: d.invoice, Customer: d.customer, Amount: fromCents(d.p.amountCents), Method: d.p.method, Reference: d.p.reference ?? "" }));
    } else if (type === "expenses") {
      const data = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.businessId, bid), gte(expenses.expenseDate, range.from), lte(expenses.expenseDate, range.to)))
        .orderBy(desc(expenses.expenseDate));
      rows = data.map((e) => ({ Date: e.expenseDate, Name: e.name, Category: e.category, Supplier: e.supplier ?? "", Amount: fromCents(e.amountCents), Tax: fromCents(e.taxCents), Method: e.method ?? "" }));
    } else if (type === "customers") {
      const data = await db.select().from(customers).where(and(eq(customers.businessId, bid), eq(customers.archived, false)));
      rows = data.map((c) => ({
        Name: c.name, Company: c.companyName ?? "", Email: c.email ?? "", Phone: c.phone ?? "",
        Address: c.address ?? "", City: c.city ?? "", State: c.state ?? "", Postcode: c.postcode ?? "",
        Country: c.country ?? "", "Tax No": c.taxNo ?? "",
      }));
    }

    const csv = rows.length > 0 ? toCsv(rows) : "No data for the selected period";
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bizflow-${type}-${range.from}-to-${range.to}.csv"`,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
