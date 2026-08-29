import { z } from "zod";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { handleError, ok, pagination, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { today } from "@/lib/format";

const schema = z.object({
  name: z.string().min(1, "Expense name is required"),
  category: z.string().optional(),
  supplier: z.string().nullable().optional(),
  amountCents: z.number().int().min(0),
  taxCents: z.number().int().min(0).optional(),
  expenseDate: z.string().optional(),
  method: z.string().nullable().optional(),
  receiptUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("expenses.read");
    const url = new URL(request.url);
    const { page, pageSize, offset } = pagination(url);
    const filters = [eq(expenses.businessId, session.businessId)];
    const category = url.searchParams.get("category");
    if (category && category !== "all") filters.push(eq(expenses.category, category));
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (from) filters.push(gte(expenses.expenseDate, from));
    if (to) filters.push(lte(expenses.expenseDate, to));
    const where = and(...filters);

    const items = await db.select().from(expenses).where(where).orderBy(desc(expenses.expenseDate), desc(expenses.id)).limit(pageSize).offset(offset);
    const [total] = await db.select({ n: count() }).from(expenses).where(where);
    return ok({ items, page, pageSize, total: total?.n ?? 0 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("expenses.write");
    const body = await parseBody(request, schema);
    const [row] = await db
      .insert(expenses)
      .values({
        ...body,
        businessId: session.businessId,
        category: body.category ?? "Other",
        expenseDate: body.expenseDate || today(),
        createdBy: session.user.id,
      })
      .returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `recorded expense ${row.name}`, entityType: "expense", entityId: row.id });
    return ok({ expense: row }, 201);
  } catch (error) {
    return handleError(error);
  }
}
