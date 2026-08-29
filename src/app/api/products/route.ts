import { z } from "zod";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { handleError, ok, pagination, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  kind: z.enum(["service", "product"]).optional(),
  priceCents: z.number().int().min(0).default(0),
  costCents: z.number().int().min(0).default(0),
  taxRateBp: z.number().int().min(0).max(10000).default(0),
  discountBp: z.number().int().min(0).max(10000).default(0),
  durationMinutes: z.number().int().min(0).max(1440).optional(),
  bookable: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("products.read");
    const url = new URL(request.url);
    const { page, pageSize, offset } = pagination(url);
    const q = url.searchParams.get("q")?.trim();
    const filters = [eq(products.businessId, session.businessId)];
    if (url.searchParams.get("bookable") === "1") filters.push(eq(products.bookable, true));
    if (url.searchParams.get("active") === "1") filters.push(eq(products.active, true));
    if (q) {
      const cond = or(ilike(products.name, `%${q}%`), ilike(products.sku, `%${q}%`), ilike(products.category, `%${q}%`));
      if (cond) filters.push(cond);
    }
    const where = and(...filters);
    const items = await db.select().from(products).where(where).orderBy(desc(products.createdAt)).limit(pageSize).offset(offset);
    const [total] = await db.select({ n: count() }).from(products).where(where);
    return ok({ items, page, pageSize, total: total?.n ?? 0 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("products.write");
    const body = await parseBody(request, schema);
    const [row] = await db.insert(products).values({ ...body, businessId: session.businessId }).returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `added ${row.kind} ${row.name}`, entityType: "product", entityId: row.id });
    return ok({ product: row }, 201);
  } catch (error) {
    return handleError(error);
  }
}
