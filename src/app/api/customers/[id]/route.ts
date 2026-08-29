import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  taxNo: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

async function scoped(businessId: number, id: number) {
  const [row] = await db.select().from(customers).where(and(eq(customers.id, id), eq(customers.businessId, businessId))).limit(1);
  if (!row) throw new AppError("Customer not found.", 404, "not_found");
  return row;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("customers.read");
    const { id } = await params;
    return ok({ customer: await scoped(session.businessId, Number(id)) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("customers.write");
    const { id } = await params;
    await scoped(session.businessId, Number(id));
    const body = await parseBody(request, schema);
    const [row] = await db.update(customers).set(body).where(eq(customers.id, Number(id))).returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `updated customer ${row.name}`, entityType: "customer", entityId: row.id });
    return ok({ customer: row });
  } catch (error) {
    return handleError(error);
  }
}

/** Soft delete (business rule #10 — safe archiving of records with financial history). */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("customers.write");
    const { id } = await params;
    const row = await scoped(session.businessId, Number(id));
    await db.update(customers).set({ archived: true }).where(eq(customers.id, row.id));
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `archived customer ${row.name}`, entityType: "customer", entityId: row.id });
    return ok({ archived: true });
  } catch (error) {
    return handleError(error);
  }
}
