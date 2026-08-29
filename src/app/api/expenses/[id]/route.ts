import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  supplier: z.string().nullable().optional(),
  amountCents: z.number().int().min(0).optional(),
  taxCents: z.number().int().min(0).optional(),
  expenseDate: z.string().optional(),
  method: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

async function scoped(businessId: number, id: number) {
  const [row] = await db.select().from(expenses).where(and(eq(expenses.id, id), eq(expenses.businessId, businessId))).limit(1);
  if (!row) throw new AppError("Expense not found.", 404, "not_found");
  return row;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("expenses.write");
    const { id } = await params;
    const row = await scoped(session.businessId, Number(id));
    const body = await parseBody(request, schema);
    const [updated] = await db.update(expenses).set(body).where(eq(expenses.id, row.id)).returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `updated expense ${updated.name}`, entityType: "expense", entityId: row.id });
    return ok({ expense: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("expenses.write");
    const { id } = await params;
    const row = await scoped(session.businessId, Number(id));
    await db.delete(expenses).where(eq(expenses.id, row.id));
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `deleted expense ${row.name}`, entityType: "expense", entityId: row.id });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
