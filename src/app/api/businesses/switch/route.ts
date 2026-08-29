import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireSession } from "@/lib/api";
import { switchBusiness } from "@/lib/auth";

const schema = z.object({ businessId: z.number().int().positive() });

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const { businessId } = await parseBody(request, schema);
    const rows = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.userId, session.user.id), eq(memberships.businessId, businessId), eq(memberships.status, "active")))
      .limit(1);
    if (rows.length === 0) throw new AppError("You do not have access to that workspace.", 403, "forbidden");
    await switchBusiness(session.sessionId, businessId);
    return ok({ businessId });
  } catch (error) {
    return handleError(error);
  }
}
