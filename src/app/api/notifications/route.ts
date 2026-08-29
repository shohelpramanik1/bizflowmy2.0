import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { handleError, ok, requireBusiness } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireBusiness();
    const items = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.businessId, session.businessId), or(isNull(notifications.userId), eq(notifications.userId, session.user.id))))
      .orderBy(desc(notifications.createdAt))
      .limit(80);
    return ok({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH() {
  try {
    const session = await requireBusiness();
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.businessId, session.businessId), isNull(notifications.readAt)));
    return ok({ marked: true });
  } catch (error) {
    return handleError(error);
  }
}
