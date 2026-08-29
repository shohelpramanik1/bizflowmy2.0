import { z } from "zod";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, memberships, products } from "@/db/schema";
import { handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity, notify } from "@/lib/activity";

const schema = z.object({
  customerId: z.number().int().positive().nullable().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().nullable().optional(),
  customerEmail: z.string().nullable().optional(),
  productId: z.number().int().positive().nullable().optional(),
  serviceName: z.string().nullable().optional(),
  staffMembershipId: z.number().int().positive().nullable().optional(),
  bookingDate: z.string().min(8),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("bookings.read");
    const url = new URL(request.url);
    const filters = [eq(bookings.businessId, session.businessId)];
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const status = url.searchParams.get("status");
    if (from) filters.push(gte(bookings.bookingDate, from));
    if (to) filters.push(lte(bookings.bookingDate, to));
    if (status && status !== "all") filters.push(eq(bookings.status, status));

    const items = await db
      .select({ booking: bookings, staffName: memberships.name, productName: products.name })
      .from(bookings)
      .leftJoin(memberships, eq(memberships.id, bookings.staffMembershipId))
      .leftJoin(products, eq(products.id, bookings.productId))
      .where(and(...filters))
      .orderBy(asc(bookings.bookingDate), asc(bookings.startTime))
      .limit(500);
    return ok({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("bookings.write");
    const body = await parseBody(request, schema);
    const [row] = await db.insert(bookings).values({ ...body, businessId: session.businessId }).returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `created booking for ${row.customerName}`, entityType: "booking", entityId: row.id });
    await notify({ businessId: session.businessId, type: "booking", title: "New booking created", body: `${row.customerName} — ${row.bookingDate} ${row.startTime}`, link: "/app/bookings" });
    return ok({ booking: row }, 201);
  } catch (error) {
    return handleError(error);
  }
}
