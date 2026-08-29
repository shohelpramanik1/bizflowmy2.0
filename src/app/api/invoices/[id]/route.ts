import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoiceItems, invoices, payments } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { computeTotals, deriveInvoiceStatus, INVOICE_STATUSES, loadInvoiceWithItems } from "@/lib/documents";
import { logActivity } from "@/lib/activity";
import { lineSchema } from "@/lib/schemas";

const schema = z.object({
  customerId: z.number().int().positive().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  paymentTerms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  bankInfo: z.string().nullable().optional(),
  items: z.array(lineSchema).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("invoices.read");
    const { id } = await params;
    const { invoice, items } = await loadInvoiceWithItems(session.businessId, Number(id));
    const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId)).limit(1);
    const paymentRows = await db.select().from(payments).where(eq(payments.invoiceId, invoice.id));
    return ok({ invoice, items, customer, payments: paymentRows });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("invoices.write");
    const { id } = await params;
    const { invoice } = await loadInvoiceWithItems(session.businessId, Number(id));
    const body = await parseBody(request, schema);

    // Business rule #6 — finalised invoices with payments cannot silently change amounts.
    if (body.items && invoice.paidCents > 0) {
      throw new AppError("This invoice already has recorded payments and its line items are locked.", 409, "locked");
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.customerId) patch.customerId = body.customerId;
    if (body.issueDate) patch.issueDate = body.issueDate;
    if (body.dueDate) patch.dueDate = body.dueDate;
    if (body.paymentTerms !== undefined) patch.paymentTerms = body.paymentTerms;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (body.bankInfo !== undefined) patch.bankInfo = body.bankInfo;

    let totalCents = invoice.totalCents;
    if (body.items) {
      const totals = computeTotals(body.items);
      totalCents = totals.totalCents;
      patch.subtotalCents = totals.subtotalCents;
      patch.discountCents = totals.discountCents;
      patch.taxCents = totals.taxCents;
      patch.totalCents = totals.totalCents;
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
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
    }

    if (body.status) {
      patch.status = body.status === "cancelled" ? "cancelled" : deriveInvoiceStatus(body.status, totalCents, invoice.paidCents, (body.dueDate ?? invoice.dueDate) as string);
      if (body.status !== "draft") patch.lockedAt = invoice.lockedAt ?? new Date();
    }

    const [updated] = await db.update(invoices).set(patch).where(eq(invoices.id, invoice.id)).returning();
    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: body.status ? `marked invoice ${invoice.number} as ${String(patch.status)}` : `updated invoice ${invoice.number}`,
      entityType: "invoice",
      entityId: invoice.id,
      meta: { before: { total: invoice.totalCents, status: invoice.status }, after: { total: updated.totalCents, status: updated.status } },
    });
    return ok({ invoice: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("invoices.write");
    const { id } = await params;
    const { invoice } = await loadInvoiceWithItems(session.businessId, Number(id));
    if (invoice.paidCents > 0) throw new AppError("Invoices with payments can only be cancelled, not deleted.", 409, "locked");
    await db.update(invoices).set({ archived: true, status: "cancelled" }).where(eq(invoices.id, invoice.id));
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `archived invoice ${invoice.number}`, entityType: "invoice", entityId: invoice.id });
    return ok({ archived: true });
  } catch (error) {
    return handleError(error);
  }
}
