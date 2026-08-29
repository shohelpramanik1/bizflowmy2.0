import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  kind: z.enum(["service", "product"]).optional(),
  priceCents: z.number().int().min(0).optional(),
  costCents: z.number().int().min(0).optional(),
  taxRateBp: z.number().int().min(0).max(10000).optional(),
  discountBp: z.number().int().min(0).max(10000).optional(),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
  bookable: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("products.write");
    const { id } = await params;
    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, Number(id)), eq(products.businessId, session.businessId)))
      .limit(1);
    if (!existing) throw new AppError("Item not found.", 404, "not_found");
    const body = await parseBody(request, schema);
    const [row] = await db.update(products).set(body).where(eq(products.id, existing.id)).returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `updated item ${row.name}`, entityType: "product", entityId: row.id });
    return ok({ product: row });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("products.write");
    const { id } = await params;
    const [existing] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, Number(id)), eq(products.businessId, session.businessId)))
      .limit(1);
    if (!existing) throw new AppError("Item not found.", 404, "not_found");
    await db.update(products).set({ active: false }).where(eq(products.id, existing.id));
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `deactivated item ${existing.name}`, entityType: "product", entityId: existing.id });
    return ok({ deactivated: true });
  } catch (error) {
    return handleError(error);
  }
}
