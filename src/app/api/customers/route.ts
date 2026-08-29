import { z } from "zod";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices } from "@/db/schema";
import { handleError, ok, pagination, parseBody, requireBusiness } from "@/lib/api";
import { assertWithinLimit } from "@/lib/plans";
import { logActivity } from "@/lib/activity";
import { randomToken } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1, "Customer name is required"),
  companyName: z.string().nullable().optional(),
  email: z.string().email("Enter a valid email").nullable().optional().or(z.literal("")),
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

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("customers.read");
    const url = new URL(request.url);
    const { page, pageSize, offset } = pagination(url);
    const q = url.searchParams.get("q")?.trim();
    const state = url.searchParams.get("state")?.trim();

    const filters = [eq(customers.businessId, session.businessId), eq(customers.archived, false)];
    if (q) {
      const like = `%${q}%`;
      const cond = or(ilike(customers.name, like), ilike(customers.companyName, like), ilike(customers.email, like), ilike(customers.phone, like));
      if (cond) filters.push(cond);
    }
    if (state) filters.push(eq(customers.state, state));
    const where = and(...filters);

    const rows = await db
      .select({
        customer: customers,
        invoiceCount: sql<number>`(SELECT COUNT(*)::int FROM ${invoices} WHERE ${invoices.customerId} = ${customers.id} AND ${invoices.archived} = false)`,
        outstanding: sql<number>`(SELECT COALESCE(SUM(${invoices.totalCents} - ${invoices.paidCents}),0)::int FROM ${invoices} WHERE ${invoices.customerId} = ${customers.id} AND ${invoices.status} NOT IN ('paid','cancelled','draft') AND ${invoices.archived} = false)`,
      })
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [total] = await db.select({ n: count() }).from(customers).where(where);
    return ok({ items: rows, page, pageSize, total: total?.n ?? 0 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("customers.write");
    await assertWithinLimit(session.businessId, "customers");
    const body = await parseBody(request, schema);
    const [row] = await db
      .insert(customers)
      .values({
        ...body,
        email: body.email || null,
        businessId: session.businessId,
        country: body.country ?? "Malaysia",
        portalToken: randomToken(18),
      })
      .returning();
    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: `added customer ${row.name}`,
      entityType: "customer",
      entityId: row.id,
    });
    return ok({ customer: row }, 201);
  } catch (error) {
    return handleError(error);
  }
}
