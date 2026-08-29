import { and, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, emailLogs, invoices, tasks } from "@/db/schema";
import { handleError, ok, requireBusiness } from "@/lib/api";
import { renderEmail } from "@/lib/messaging";
import { daysBetween, formatDate, formatMoney, today } from "@/lib/format";
import { logActivity, notify } from "@/lib/activity";

export async function GET() {
  try {
    const session = await requireBusiness("invoices.read");
    const rows = await db
      .select({ invoice: invoices, customerName: customers.name, customerEmail: customers.email, customerPhone: customers.phone })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(
        and(
          eq(invoices.businessId, session.businessId),
          eq(invoices.archived, false),
          ne(invoices.status, "draft"),
          ne(invoices.status, "cancelled"),
          ne(invoices.status, "paid"),
          lt(invoices.dueDate, today()),
        ),
      )
      .orderBy(invoices.dueDate);

    const items = rows.map((r) => ({
      ...r,
      daysOverdue: daysBetween(r.invoice.dueDate, today()),
      balanceCents: r.invoice.totalCents - r.invoice.paidCents,
    }));
    const stages = session.business?.reminderSettings?.stages ?? [-3, 0, 3, 7, 14];
    return ok({ items, stages, auto: session.business?.reminderSettings?.auto ?? true });
  } catch (error) {
    return handleError(error);
  }
}

/** Runs the reminder sweep: queues messages and creates follow-up tasks. */
export async function POST() {
  try {
    const session = await requireBusiness("invoices.write");
    const sym = session.business?.currencySymbol ?? "RM";
    const rows = await db
      .select({ invoice: invoices, customerName: customers.name, customerEmail: customers.email })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(
        and(
          eq(invoices.businessId, session.businessId),
          eq(invoices.archived, false),
          ne(invoices.status, "draft"),
          ne(invoices.status, "cancelled"),
          ne(invoices.status, "paid"),
          lt(invoices.dueDate, today()),
        ),
      );

    for (const r of rows) {
      const rendered = renderEmail("invoice_overdue", {
        businessName: session.business?.name ?? "BizFlow MY",
        customerName: r.customerName,
        documentNumber: r.invoice.number,
        amount: formatMoney(r.invoice.totalCents - r.invoice.paidCents, sym),
        dueDate: formatDate(r.invoice.dueDate),
      });
      await db.insert(emailLogs).values({
        businessId: session.businessId,
        customerId: r.invoice.customerId,
        template: "invoice_overdue",
        toEmail: r.customerEmail ?? "no-email@example.com",
        subject: rendered.subject,
        body: rendered.body,
        status: "queued",
      });

      // Automation: overdue invoice → follow-up task (only once per invoice)
      const existing = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.businessId, session.businessId), sql`${tasks.title} = ${`Chase payment for ${r.invoice.number}`}`))
        .limit(1);
      if (existing.length === 0) {
        await db.insert(tasks).values({
          businessId: session.businessId,
          title: `Chase payment for ${r.invoice.number}`,
          description: `${r.customerName} — ${daysBetween(r.invoice.dueDate, today())} days overdue.`,
          customerId: r.invoice.customerId,
          priority: "high",
          status: "todo",
          dueDate: today(),
          createdBy: session.user.id,
        });
      }
    }

    if (rows.length > 0) {
      await notify({ businessId: session.businessId, type: "reminder", title: `${rows.length} payment reminder(s) queued`, body: "Follow-up tasks were created automatically.", link: "/app/invoices" });
      await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `sent ${rows.length} payment reminder(s)` });
    }
    return ok({ sent: rows.length });
  } catch (error) {
    return handleError(error);
  }
}
