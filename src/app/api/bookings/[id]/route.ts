import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  bookingDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  staffMembershipId: z.number().int().positive().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("bookings.write");
    const { id } = await params;
    const [row] = await db.select().from(bookings).where(and(eq(bookings.id, Number(id)), eq(bookings.businessId, session.businessId))).limit(1);
    if (!row) throw new AppError("Booking not found.", 404, "not_found");
    const body = await parseBody(request, schema);
    const [updated] = await db.update(bookings).set(body).where(eq(bookings.id, row.id)).returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `updated booking for ${row.customerName}`, entityType: "booking", entityId: row.id });
    return ok({ booking: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("bookings.write");
    const { id } = await params;
    const [row] = await db.select().from(bookings).where(and(eq(bookings.id, Number(id)), eq(bookings.businessId, session.businessId))).limit(1);
    if (!row) throw new AppError("Booking not found.", 404, "not_found");
    await db.delete(bookings).where(eq(bookings.id, row.id));
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
