import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoiceItems, invoices, quotations, tasks } from "@/db/schema";
import { AppError, handleError, ok, requireBusiness } from "@/lib/api";
import { loadQuotationWithItems, nextInvoiceNumber } from "@/lib/documents";
import { assertWithinLimit } from "@/lib/plans";
import { logActivity, notify, track } from "@/lib/activity";
import { randomToken } from "@/lib/auth";
import { addDays, today } from "@/lib/format";

/**
 * Business rule #9 — conversion preserves the original quotation and keeps the
 * relationship between the quotation and the generated invoice.
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("invoices.write");
    await assertWithinLimit(session.businessId, "invoices");
    const { id } = await params;
    const { quotation, items } = await loadQuotationWithItems(session.businessId, Number(id));

    if (quotation.convertedInvoiceId) {
      throw new AppError("This quotation has already been converted to an invoice.", 409, "already_converted");
    }

    const business = session.business!;
    const issueDate = today();
    const number = await nextInvoiceNumber(session.businessId);

    const [invoice] = await db
      .insert(invoices)
      .values({
        businessId: session.businessId,
        customerId: quotation.customerId,
        quotationId: quotation.id,
        number,
        issueDate,
        dueDate: addDays(issueDate, business.paymentTermDays ?? 30),
        status: "draft",
        subtotalCents: quotation.subtotalCents,
        discountCents: quotation.discountCents,
        taxCents: quotation.taxCents,
        totalCents: quotation.totalCents,
        paymentTerms: business.defaultPaymentTerms ?? null,
        notes: quotation.notes,
        bankInfo: business.bankInfo ?? null,
        publicToken: randomToken(18),
        createdBy: session.user.id,
      })
      .returning();

    if (items.length > 0) {
      await db.insert(invoiceItems).values(
        items.map((l, i) => ({
          invoiceId: invoice.id,
          productId: l.productId,
          name: l.name,
          description: l.description,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          discountBp: l.discountBp,
          taxRateBp: l.taxRateBp,
          lineTotalCents: l.lineTotalCents,
          sortOrder: i,
        })),
      );
    }

    await db
      .update(quotations)
      .set({ convertedInvoiceId: invoice.id, status: "converted", updatedAt: new Date() })
      .where(eq(quotations.id, quotation.id));

    const [customer] = await db.select().from(customers).where(eq(customers.id, quotation.customerId)).limit(1);

    // Automation: invoice created → payment follow-up task
    await db.insert(tasks).values({
      businessId: session.businessId,
      title: `Follow up payment for ${number}`,
      description: `Auto-created when quotation ${quotation.number} was converted.`,
      customerId: quotation.customerId,
      priority: "medium",
      status: "todo",
      dueDate: addDays(issueDate, business.paymentTermDays ?? 30),
      createdBy: session.user.id,
    });

    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: `converted quotation ${quotation.number} into invoice ${number}`,
      entityType: "invoice",
      entityId: invoice.id,
    });
    await notify({
      businessId: session.businessId,
      type: "invoice",
      title: `Invoice ${number} created`,
      body: `Converted from ${quotation.number} for ${customer?.name ?? "customer"}.`,
      link: `/app/invoices/${invoice.id}`,
    });
    await track("quotation_converted", { quotationId: quotation.id }, session.businessId, session.user.id);

    return ok({ invoice }, 201);
  } catch (error) {
    return handleError(error);
  }
}
