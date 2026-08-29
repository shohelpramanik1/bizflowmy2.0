import { z } from "zod";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, payments } from "@/db/schema";
import { AppError, handleError, ok, pagination, parseBody, requireBusiness } from "@/lib/api";
import { recalcInvoicePaid } from "@/lib/documents";
import { logActivity, notify, track } from "@/lib/activity";
import { formatMoney, today } from "@/lib/format";

const schema = z.object({
  invoiceId: z.number().int().positive({ message: "Select an invoice" }),
  amountCents: z.number().int().positive({ message: "Enter a payment amount" }),
  paidAt: z.string().optional(),
  method: z.string().optional(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  allowOverpayment: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("payments.read");
    const url = new URL(request.url);
    const { page, pageSize, offset } = pagination(url);
    const filters = [eq(payments.businessId, session.businessId)];
    const invoiceId = url.searchParams.get("invoiceId");
    if (invoiceId) filters.push(eq(payments.invoiceId, Number(invoiceId)));
    const method = url.searchParams.get("method");
    if (method && method !== "all") filters.push(eq(payments.method, method));
    const where = and(...filters);

    const items = await db
      .select({ payment: payments, invoiceNumber: invoices.number, customerName: customers.name })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(customers, eq(customers.id, payments.customerId))
      .where(where)
      .orderBy(desc(payments.paidAt), desc(payments.id))
      .limit(pageSize)
      .offset(offset);
    const [total] = await db.select({ n: count() }).from(payments).where(where);
    return ok({ items, page, pageSize, total: total?.n ?? 0 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("payments.write");
    const body = await parseBody(request, schema);

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, body.invoiceId), eq(invoices.businessId, session.businessId)))
      .limit(1);
    if (!invoice) throw new AppError("Invoice not found.", 404, "not_found");

    const balance = invoice.totalCents - invoice.paidCents;
    // Business rule #7 — payments cannot exceed the outstanding balance unless explicitly allowed.
    if (!body.allowOverpayment && body.amountCents > balance) {
      throw new AppError(
        `Payment exceeds the outstanding balance of ${formatMoney(balance, session.business?.currencySymbol ?? "RM")}.`,
        422,
        "overpayment",
      );
    }

    const [payment] = await db
      .insert(payments)
      .values({
        businessId: session.businessId,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amountCents: body.amountCents,
        paidAt: body.paidAt || today(),
        method: body.method ?? "bank_transfer",
        reference: body.reference ?? null,
        notes: body.notes ?? null,
        createdBy: session.user.id,
      })
      .returning();

    const result = await recalcInvoicePaid(invoice.id);

    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: `recorded a payment of ${formatMoney(body.amountCents, session.business?.currencySymbol ?? "RM")} for ${invoice.number}`,
      entityType: "payment",
      entityId: payment.id,
    });
    await notify({
      businessId: session.businessId,
      type: "payment",
      title: `Payment received for ${invoice.number}`,
      body: `${formatMoney(body.amountCents, session.business?.currencySymbol ?? "RM")} — invoice is now ${result.status.replace("_", " ")}.`,
      link: `/app/invoices/${invoice.id}`,
    });
    await track("payment_recorded", { amount: body.amountCents }, session.businessId, session.user.id);

    return ok({ payment, invoiceStatus: result.status, paidCents: result.paid }, 201);
  } catch (error) {
    return handleError(error);
  }
}
