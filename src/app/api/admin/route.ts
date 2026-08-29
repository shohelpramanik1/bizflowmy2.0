import { z } from "zod";
import { desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, announcements, businesses, invoices, subscriptions, supportTickets, users } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requirePlatformAdmin } from "@/lib/api";
import { getPlans } from "@/lib/plans";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const monthAgo = new Date(Date.now() - 30 * 864e5);
    const plans = await getPlans();

    const [[userStats], [bizStats], subs, [invStats], events, tickets, recentBusinesses, recentUsers] = await Promise.all([
      db.select({
        total: sql<number>`COUNT(*)::int`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${users.status} = 'active')::int`,
        suspended: sql<number>`COUNT(*) FILTER (WHERE ${users.status} = 'suspended')::int`,
        newThisMonth: sql<number>`COUNT(*) FILTER (WHERE ${users.createdAt} >= ${monthAgo.toISOString()})::int`,
      }).from(users),
      db.select({
        total: sql<number>`COUNT(*)::int`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${businesses.status} = 'active')::int`,
        newThisMonth: sql<number>`COUNT(*) FILTER (WHERE ${businesses.createdAt} >= ${monthAgo.toISOString()})::int`,
      }).from(businesses),
      db.select({ planCode: subscriptions.planCode, status: subscriptions.status, n: sql<number>`COUNT(*)::int` }).from(subscriptions).groupBy(subscriptions.planCode, subscriptions.status),
      db.select({ total: sql<number>`COUNT(*)::int`, value: sql<number>`COALESCE(SUM(${invoices.totalCents}),0)::int` }).from(invoices),
      db.select({ event: analyticsEvents.event, n: sql<number>`COUNT(*)::int` }).from(analyticsEvents).where(gte(analyticsEvents.createdAt, monthAgo)).groupBy(analyticsEvents.event).orderBy(sql`2 DESC`).limit(12),
      db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(10),
      db.select({ business: businesses, plan: subscriptions.planCode, ownerName: users.name, ownerEmail: users.email })
        .from(businesses)
        .leftJoin(subscriptions, eq(subscriptions.businessId, businesses.id))
        .leftJoin(users, eq(users.id, businesses.ownerId))
        .orderBy(desc(businesses.createdAt))
        .limit(25),
      db.select({ id: users.id, name: users.name, email: users.email, status: users.status, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(25),
    ]);

    const paidSubs = subs.filter((s) => s.planCode !== "free" && s.status === "active");
    const mrrCents = paidSubs.reduce((sum, s) => sum + (plans.find((p) => p.code === s.planCode)?.priceCents ?? 0) * s.n, 0);
    const cancellations = subs.filter((s) => s.status === "cancelled").reduce((a, s) => a + s.n, 0);
    const popular = [...subs].sort((a, b) => b.n - a.n)[0]?.planCode ?? "free";

    return ok({
      users: userStats,
      businesses: bizStats,
      subscriptions: subs,
      mrrCents,
      cancellations,
      popularPlan: popular,
      invoices: invStats,
      events,
      tickets,
      recentBusinesses,
      recentUsers,
      plans,
    });
  } catch (error) {
    return handleError(error);
  }
}

const actionSchema = z.object({
  action: z.enum(["suspend_user", "activate_user", "suspend_business", "activate_business", "set_plan", "announce", "resolve_ticket"]),
  id: z.number().int().positive().optional(),
  planCode: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const payload = await parseBody(request, actionSchema);

    switch (payload.action) {
      case "suspend_user":
      case "activate_user": {
        if (!payload.id) throw new AppError("Missing user.", 400);
        await db.update(users).set({ status: payload.action === "suspend_user" ? "suspended" : "active" }).where(eq(users.id, payload.id));
        break;
      }
      case "suspend_business":
      case "activate_business": {
        if (!payload.id) throw new AppError("Missing business.", 400);
        await db.update(businesses).set({ status: payload.action === "suspend_business" ? "suspended" : "active" }).where(eq(businesses.id, payload.id));
        break;
      }
      case "set_plan": {
        if (!payload.id || !payload.planCode) throw new AppError("Missing business or plan.", 400);
        const existing = await db.select().from(subscriptions).where(eq(subscriptions.businessId, payload.id)).limit(1);
        if (existing.length > 0) {
          await db.update(subscriptions).set({ planCode: payload.planCode, status: "active" }).where(eq(subscriptions.businessId, payload.id));
        } else {
          await db.insert(subscriptions).values({ businessId: payload.id, planCode: payload.planCode, status: "active" });
        }
        break;
      }
      case "announce": {
        if (!payload.title || !payload.body) throw new AppError("Title and message are required.", 400);
        await db.insert(announcements).values({ title: payload.title, body: payload.body });
        break;
      }
      case "resolve_ticket": {
        if (!payload.id) throw new AppError("Missing ticket.", 400);
        await db.update(supportTickets).set({ status: "resolved" }).where(eq(supportTickets.id, payload.id));
        break;
      }
    }
    return ok({ done: true });
  } catch (error) {
    return handleError(error);
  }
}
