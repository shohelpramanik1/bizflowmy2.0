import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, quotationItems, quotations } from "@/db/schema";
import { handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { computeTotals, loadQuotationWithItems, QUOTATION_STATUSES } from "@/lib/documents";
import { logActivity, notify } from "@/lib/activity";
import { lineSchema } from "@/lib/schemas";

const schema = z.object({
  customerId: z.number().int().positive().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  status: z.enum(QUOTATION_STATUSES).optional(),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  items: z.array(lineSchema).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("quotations.read");
    const { id } = await params;
    const { quotation, items } = await loadQuotationWithItems(session.businessId, Number(id));
    const [customer] = await db.select().from(customers).where(eq(customers.id, quotation.customerId)).limit(1);
    return ok({ quotation, items, customer });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("quotations.write");
    const { id } = await params;
    const { quotation } = await loadQuotationWithItems(session.businessId, Number(id));
    const body = await parseBody(request, schema);

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.customerId) patch.customerId = body.customerId;
    if (body.issueDate) patch.issueDate = body.issueDate;
    if (body.expiryDate !== undefined) patch.expiryDate = body.expiryDate;
    if (body.status) patch.status = body.status;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.terms !== undefined) patch.terms = body.terms;

    if (body.items) {
      const totals = computeTotals(body.items);
      patch.subtotalCents = totals.subtotalCents;
      patch.discountCents = totals.discountCents;
      patch.taxCents = totals.taxCents;
      patch.totalCents = totals.totalCents;
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotation.id));
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
    }

    const [updated] = await db.update(quotations).set(patch).where(eq(quotations.id, quotation.id)).returning();
    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: body.status ? `marked quotation ${quotation.number} as ${body.status}` : `updated quotation ${quotation.number}`,
      entityType: "quotation",
      entityId: quotation.id,
    });
    if (body.status === "accepted") {
      await notify({
        businessId: session.businessId,
        type: "quotation",
        title: `Quotation ${quotation.number} accepted 🎉`,
        body: "Convert it into an invoice to start collecting payment.",
        link: `/app/quotations/${quotation.id}`,
      });
    }
    return ok({ quotation: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("quotations.write");
    const { id } = await params;
    const { quotation } = await loadQuotationWithItems(session.businessId, Number(id));
    await db.update(quotations).set({ archived: true }).where(eq(quotations.id, quotation.id));
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `archived quotation ${quotation.number}`, entityType: "quotation", entityId: quotation.id });
    return ok({ archived: true });
  } catch (error) {
    return handleError(error);
  }
}
