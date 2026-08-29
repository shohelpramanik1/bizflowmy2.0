import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  customerId: z.number().int().positive().nullable().optional(),
  projectId: z.number().int().positive().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["todo", "in_progress", "review", "waiting", "completed", "cancelled"]).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().int().min(0).nullable().optional(),
  actualHours: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("tasks.write");
    const { id } = await params;
    const [row] = await db.select().from(tasks).where(and(eq(tasks.id, Number(id)), eq(tasks.businessId, session.businessId))).limit(1);
    if (!row) throw new AppError("Task not found.", 404, "not_found");
    const body = await parseBody(request, schema);
    const patch: Record<string, unknown> = { ...body };
    if (body.status === "completed" && row.status !== "completed") patch.completedAt = new Date();
    if (body.status && body.status !== "completed") patch.completedAt = null;
    const [updated] = await db.update(tasks).set(patch).where(eq(tasks.id, row.id)).returning();
    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: body.status === "completed" ? `completed task "${updated.title}"` : `updated task "${updated.title}"`,
      entityType: "task",
      entityId: row.id,
    });
    return ok({ task: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBusiness("tasks.write");
    const { id } = await params;
    const [row] = await db.select().from(tasks).where(and(eq(tasks.id, Number(id)), eq(tasks.businessId, session.businessId))).limit(1);
    if (!row) throw new AppError("Task not found.", 404, "not_found");
    await db.delete(tasks).where(eq(tasks.id, row.id));
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `deleted task "${row.title}"`, entityType: "task", entityId: row.id });
    return ok({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
