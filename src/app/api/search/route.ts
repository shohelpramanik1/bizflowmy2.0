import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { bookings, customers, invoices, products, quotations, tasks } from "@/db/schema";
import { handleError, ok, requireBusiness } from "@/lib/api";
import { formatMoney } from "@/lib/format";

export async function GET(request: Request) {
  try {
    const session = await requireBusiness();
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (!q) return ok({ results: [] });
    const like = `%${q}%`;
    const bid = session.businessId;
    const sym = session.business?.currencySymbol ?? "RM";

    const [cust, prod, quo, inv, tsk, bkg] = await Promise.all([
      db.select().from(customers).where(and(eq(customers.businessId, bid), eq(customers.archived, false), or(ilike(customers.name, like), ilike(customers.companyName, like), ilike(customers.email, like), ilike(customers.phone, like)))).limit(5),
      db.select().from(products).where(and(eq(products.businessId, bid), or(ilike(products.name, like), ilike(products.sku, like)))).limit(4),
      db.select().from(quotations).where(and(eq(quotations.businessId, bid), ilike(quotations.number, like))).limit(4),
      db.select().from(invoices).where(and(eq(invoices.businessId, bid), ilike(invoices.number, like))).limit(4),
      db.select().from(tasks).where(and(eq(tasks.businessId, bid), ilike(tasks.title, like))).limit(4),
      db.select().from(bookings).where(and(eq(bookings.businessId, bid), ilike(bookings.customerName, like))).limit(3),
    ]);

    const results = [
      ...cust.map((c) => ({ type: "customer", id: c.id, title: c.name, subtitle: c.companyName ?? c.email ?? c.phone ?? "Customer", href: `/app/customers/${c.id}` })),
      ...inv.map((i) => ({ type: "invoice", id: i.id, title: i.number, subtitle: `${formatMoney(i.totalCents, sym)} · ${i.status}`, href: `/app/invoices/${i.id}` })),
      ...quo.map((i) => ({ type: "quote", id: i.id, title: i.number, subtitle: `${formatMoney(i.totalCents, sym)} · ${i.status}`, href: `/app/quotations/${i.id}` })),
      ...prod.map((p) => ({ type: "item", id: p.id, title: p.name, subtitle: formatMoney(p.priceCents, sym), href: `/app/products` })),
      ...tsk.map((t) => ({ type: "task", id: t.id, title: t.title, subtitle: t.status.replace("_", " "), href: `/app/tasks` })),
      ...bkg.map((b) => ({ type: "booking", id: b.id, title: b.customerName, subtitle: `${b.bookingDate} ${b.startTime}`, href: `/app/bookings` })),
    ];

    return ok({ results });
  } catch (error) {
    return handleError(error);
  }
}
