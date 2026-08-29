import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, emailLogs, invoices, quotations } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { renderEmail } from "@/lib/messaging";
import { formatDate, formatMoney } from "@/lib/format";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  docType: z.enum(["invoice", "quotation"]),
  docId: z.number().int().positive(),
  channel: z.enum(["email", "whatsapp"]).default("email"),
  template: z.string().optional(),
  markSent: z.boolean().optional(),
});

/**
 * Queues a transactional message. In production this hands off to a provider
 * (Resend/Postmark/SES); here we persist an auditable outbox record.
 */
export async function POST(request: Request) {
  try {
    const session = await requireBusiness();
    const body = await parseBody(request, schema);
    const sym = session.business?.currencySymbol ?? "RM";
    const origin = new URL(request.url).origin;

    let customerId: number;
    let subjectCtx: { number: string; total: number; due?: string; token: string | null };

    if (body.docType === "invoice") {
      const [row] = await db.select().from(invoices).where(and(eq(invoices.id, body.docId), eq(invoices.businessId, session.businessId))).limit(1);
      if (!row) throw new AppError("Invoice not found.", 404, "not_found");
      customerId = row.customerId;
      subjectCtx = { number: row.number, total: row.totalCents, due: row.dueDate, token: row.publicToken };
      if (body.markSent && row.status === "draft") {
        await db.update(invoices).set({ status: "sent", lockedAt: new Date() }).where(eq(invoices.id, row.id));
      }
    } else {
      const [row] = await db.select().from(quotations).where(and(eq(quotations.id, body.docId), eq(quotations.businessId, session.businessId))).limit(1);
      if (!row) throw new AppError("Quotation not found.", 404, "not_found");
      customerId = row.customerId;
      subjectCtx = { number: row.number, total: row.totalCents, token: row.publicToken };
      if (body.markSent && row.status === "draft") {
        await db.update(quotations).set({ status: "sent" }).where(eq(quotations.id, row.id));
      }
    }

    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    const link = subjectCtx.token
      ? `${origin}/d/${body.docType === "invoice" ? "i" : "q"}/${subjectCtx.token}`
      : `${origin}/app`;

    const rendered = renderEmail(body.docType === "invoice" ? "invoice_sent" : "quotation_sent", {
      businessName: session.business?.name ?? "BizFlow MY",
      customerName: customer?.name ?? "Customer",
      documentNumber: subjectCtx.number,
      amount: formatMoney(subjectCtx.total, sym),
      dueDate: subjectCtx.due ? formatDate(subjectCtx.due) : undefined,
      link,
      extra: session.business?.bankInfo ?? "",
    });

    await db.insert(emailLogs).values({
      businessId: session.businessId,
      customerId,
      template: body.template ?? (body.docType === "invoice" ? "invoice_sent" : "quotation_sent"),
      toEmail: customer?.email ?? "no-email@example.com",
      subject: rendered.subject,
      body: rendered.body,
      channel: body.channel,
      status: customer?.email || body.channel === "whatsapp" ? "queued" : "skipped_no_email",
    });

    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: `shared ${subjectCtx.number} via ${body.channel}`,
      entityType: body.docType,
      entityId: body.docId,
    });

    return ok({ ...rendered, link, customerEmail: customer?.email ?? null, customerPhone: customer?.whatsapp ?? customer?.phone ?? null });
  } catch (error) {
    return handleError(error);
  }
}
