import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(["owner", "admin", "manager", "staff", "accountant", "sales"]).optional(),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  status: z.enum(["active", "invited", "disabled"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("team.write");
    const { id } = await params;
    const [row] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, Number(id)), eq(memberships.businessId, session.businessId)))
      .limit(1);
    if (!row) throw new AppError("Team member not found.", 404, "not_found");
    const body = await parseBody(request, schema);
    if (row.role === "owner" && body.role && body.role !== "owner") {
      throw new AppError("The business owner role cannot be changed.", 409, "owner_locked");
    }
    const [updated] = await db.update(memberships).set(body).where(eq(memberships.id, row.id)).returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `updated team member ${updated.name ?? updated.inviteEmail}`, entityType: "membership", entityId: row.id });
    return ok({ member: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("team.write");
    const { id } = await params;
    const [row] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.id, Number(id)), eq(memberships.businessId, session.businessId)))
      .limit(1);
    if (!row) throw new AppError("Team member not found.", 404, "not_found");
    if (row.role === "owner") throw new AppError("You cannot remove the business owner.", 409, "owner_locked");
    await db.update(memberships).set({ status: "disabled" }).where(eq(memberships.id, row.id));
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `removed team member ${row.name ?? row.inviteEmail}`, entityType: "membership", entityId: row.id });
    return ok({ removed: true });
  } catch (error) {
    return handleError(error);
  }
}
