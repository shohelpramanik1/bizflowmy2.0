import { z } from "zod";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { customers, quotationItems, quotations } from "@/db/schema";
import { AppError, handleError, ok, pagination, parseBody, requireBusiness } from "@/lib/api";
import { computeTotals, nextQuotationNumber } from "@/lib/documents";
import { assertWithinLimit } from "@/lib/plans";
import { logActivity, notify, track } from "@/lib/activity";
import { randomToken } from "@/lib/auth";
import { addDays, today } from "@/lib/format";
import { lineSchema } from "@/lib/schemas";

const schema = z.object({
  customerId: z.number().int().positive({ message: "Select a customer" }),
  issueDate: z.string().min(8),
  expiryDate: z.string().nullable().optional(),
  status: z.enum(["draft", "sent"]).optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  items: z.array(lineSchema).min(1, "Add at least one line item"),
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("quotations.read");
    const url = new URL(request.url);
    const { page, pageSize, offset } = pagination(url);
    const q = url.searchParams.get("q")?.trim();
    const status = url.searchParams.get("status")?.trim();
    const customerId = url.searchParams.get("customerId");

    const filters = [eq(quotations.businessId, session.businessId), eq(quotations.archived, false)];
    if (status && status !== "all") filters.push(eq(quotations.status, status));
    if (customerId) filters.push(eq(quotations.customerId, Number(customerId)));
    if (q) {
      const cond = or(ilike(quotations.number, `%${q}%`), ilike(customers.name, `%${q}%`));
      if (cond) filters.push(cond);
    }
    const where = and(...filters);

    const items = await db
      .select({ quotation: quotations, customerName: customers.name, customerCompany: customers.companyName })
      .from(quotations)
      .innerJoin(customers, eq(customers.id, quotations.customerId))
      .where(where)
      .orderBy(desc(quotations.issueDate), desc(quotations.id))
      .limit(pageSize)
      .offset(offset);

    const [total] = await db.select({ n: count() }).from(quotations).innerJoin(customers, eq(customers.id, quotations.customerId)).where(where);
    return ok({ items, page, pageSize, total: total?.n ?? 0 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("quotations.write");
    await assertWithinLimit(session.businessId, "quotations");
    const body = await parseBody(request, schema);

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, body.customerId), eq(customers.businessId, session.businessId)))
      .limit(1);
    if (!customer) throw new AppError("Customer not found in this workspace.", 404, "not_found");

    const totals = computeTotals(body.items);
    const number = await nextQuotationNumber(session.businessId);

    const [quotation] = await db
      .insert(quotations)
      .values({
        businessId: session.businessId,
        customerId: customer.id,
        number,
        issueDate: body.issueDate || today(),
        expiryDate: body.expiryDate || addDays(body.issueDate || today(), 14),
        status: body.status ?? "draft",
        subtotalCents: totals.subtotalCents,
        discountCents: totals.discountCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        notes: body.notes ?? null,
        terms: body.terms ?? session.business?.quotationTerms ?? null,
        publicToken: randomToken(18),
        createdBy: session.user.id,
      })
      .returning();

    await db.insert(quotationItems).values(
      totals.lines.map((l, i) => ({
        quotationId: quotation.id,
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
      action: `created quotation ${number}`,
      entityType: "quotation",
      entityId: quotation.id,
      meta: { total: totals.totalCents },
    });
    await notify({ businessId: session.businessId, type: "quotation", title: `Quotation ${number} created`, body: `For ${customer.name}`, link: `/app/quotations/${quotation.id}` });
    await track("quotation_created", { total: totals.totalCents }, session.businessId, session.user.id);

    return ok({ quotation }, 201);
  } catch (error) {
    return handleError(error);
  }
}
