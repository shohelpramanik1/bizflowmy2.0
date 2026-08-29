import { z } from "zod";
import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoiceItems, invoices } from "@/db/schema";
import { AppError, handleError, ok, pagination, parseBody, requireBusiness } from "@/lib/api";
import { computeTotals, nextInvoiceNumber } from "@/lib/documents";
import { assertWithinLimit } from "@/lib/plans";
import { logActivity, notify, track } from "@/lib/activity";
import { randomToken } from "@/lib/auth";
import { addDays, today } from "@/lib/format";
import { lineSchema } from "@/lib/schemas";

const schema = z.object({
  customerId: z.number().int().positive({ message: "Select a customer" }),
  issueDate: z.string().min(8),
  dueDate: z.string().optional(),
  status: z.enum(["draft", "sent"]).optional(),
  paymentTerms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  bankInfo: z.string().nullable().optional(),
  items: z.array(lineSchema).min(1, "Add at least one line item"),
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("invoices.read");
    const url = new URL(request.url);
    const { page, pageSize, offset } = pagination(url);
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const customerId = url.searchParams.get("customerId");

    // Business rule #8 — refresh derived overdue status on read.
    await db
      .update(invoices)
      .set({ status: "overdue" })
      .where(
        and(
          eq(invoices.businessId, session.businessId),
          sql`${invoices.dueDate} < CURRENT_DATE`,
          sql`${invoices.paidCents} < ${invoices.totalCents}`,
          ne(invoices.status, "draft"),
          ne(invoices.status, "cancelled"),
          ne(invoices.status, "overdue"),
        ),
      );

    const filters = [eq(invoices.businessId, session.businessId), eq(invoices.archived, false)];
    if (status && status !== "all") filters.push(eq(invoices.status, status));
    if (customerId) filters.push(eq(invoices.customerId, Number(customerId)));
    if (q) {
      const cond = or(ilike(invoices.number, `%${q}%`), ilike(customers.name, `%${q}%`));
      if (cond) filters.push(cond);
    }
    const where = and(...filters);

    const items = await db
      .select({ invoice: invoices, customerName: customers.name, customerCompany: customers.companyName, customerPhone: customers.phone })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(where)
      .orderBy(desc(invoices.issueDate), desc(invoices.id))
      .limit(pageSize)
      .offset(offset);

    const [total] = await db.select({ n: count() }).from(invoices).innerJoin(customers, eq(customers.id, invoices.customerId)).where(where);
    return ok({ items, page, pageSize, total: total?.n ?? 0 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("invoices.write");
    await assertWithinLimit(session.businessId, "invoices");
    const body = await parseBody(request, schema);

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, body.customerId), eq(customers.businessId, session.businessId)))
      .limit(1);
    if (!customer) throw new AppError("Customer not found in this workspace.", 404, "not_found");

    const business = session.business!;
    const totals = computeTotals(body.items);
    const number = await nextInvoiceNumber(session.businessId);
    const issueDate = body.issueDate || today();

    const [invoice] = await db
      .insert(invoices)
      .values({
        businessId: session.businessId,
        customerId: customer.id,
        number,
        issueDate,
        dueDate: body.dueDate || addDays(issueDate, business.paymentTermDays ?? 30),
        status: body.status ?? "draft",
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        paymentTerms: body.paymentTerms ?? business.defaultPaymentTerms ?? null,
        notes: body.notes ?? business.invoiceNotes ?? null,
        bankInfo: body.bankInfo ?? business.bankInfo ?? null,
        publicToken: randomToken(18),
        createdBy: session.user.id,
      })
      .returning();

    await db.insert(invoiceItems).values(
      totals.lines.map((l, i) => ({
        invoiceId: invoice.id,
        productId: l.productId ?? null,
        name: l.name,
        description: l.description ?? null,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        discountBp: l.discountBp,
        taxRateBp: l.taxRateBp,
        lineTotalCents: l.lineTotalCents,
        sortOrder: i,
      })),
    );

    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: `created invoice ${number}`,
      entityType: "invoice",
      entityId: invoice.id,
      meta: { total: totals.totalCents },
    });
    await notify({ businessId: session.businessId, type: "invoice", title: `Invoice ${number} created`, body: `For ${customer.name}`, link: `/app/invoices/${invoice.id}` });
    await track("invoice_created", { total: totals.totalCents }, session.businessId, session.user.id);

    return ok({ invoice }, 201);
  } catch (error) {
    return handleError(error);
  }
}
