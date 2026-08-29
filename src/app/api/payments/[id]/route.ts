import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { AppError, handleError, ok, requireBusiness } from "@/lib/api";
import { recalcInvoicePaid } from "@/lib/documents";
import { logActivity } from "@/lib/activity";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("payments.write");
    const { id } = await params;
    const [row] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, Number(id)), eq(payments.businessId, session.businessId)))
      .limit(1);
    if (!row) throw new AppError("Payment not found.", 404, "not_found");
    await db.delete(payments).where(eq(payments.id, row.id));
    await recalcInvoicePaid(row.invoiceId);
    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: `deleted a payment record`,
      entityType: "payment",
      entityId: row.id,
      meta: { amountCents: row.amountCents, invoiceId: row.invoiceId },
    });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
