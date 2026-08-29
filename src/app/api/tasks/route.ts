import { z } from "zod";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, memberships, tasks } from "@/db/schema";
import { handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity, notify } from "@/lib/activity";

const schema = z.object({
  title: z.string().min(1, "Task name is required"),
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
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("tasks.read");
    const url = new URL(request.url);
    const filters = [eq(tasks.businessId, session.businessId)];
    const status = url.searchParams.get("status");
    if (status && status !== "all") filters.push(eq(tasks.status, status));
    const assignee = url.searchParams.get("assigneeId");
    if (assignee) filters.push(eq(tasks.assigneeId, Number(assignee)));
    const customerId = url.searchParams.get("customerId");
    if (customerId) filters.push(eq(tasks.customerId, Number(customerId)));
    const priority = url.searchParams.get("priority");
    if (priority && priority !== "all") filters.push(eq(tasks.priority, priority));

    // Staff members only see their own assignments (tenant + role isolation).
    if (session.role === "staff" && session.membership) filters.push(eq(tasks.assigneeId, session.membership.id));

    const items = await db
      .select({ task: tasks, customerName: customers.name, assigneeName: memberships.name })
      .from(tasks)
      .leftJoin(customers, eq(customers.id, tasks.customerId))
      .leftJoin(memberships, eq(memberships.id, tasks.assigneeId))
      .where(and(...filters))
      .orderBy(asc(tasks.position), desc(tasks.id))
      .limit(300);
    return ok({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("tasks.write");
    const body = await parseBody(request, schema);
    const [row] = await db
      .insert(tasks)
      .values({ ...body, businessId: session.businessId, createdBy: session.user.id })
      .returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `created task "${row.title}"`, entityType: "task", entityId: row.id });
    if (row.assigneeId) {
      await notify({ businessId: session.businessId, type: "task", title: "Task assigned", body: row.title, link: `/app/tasks` });
    }
    return ok({ task: row }, 201);
  } catch (error) {
    return handleError(error);
  }
}
