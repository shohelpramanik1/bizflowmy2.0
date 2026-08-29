import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { getPlanForBusiness, getPlans, getUsage } from "@/lib/plans";
import { logActivity, notify, track } from "@/lib/activity";

const schema = z.object({ planCode: z.string().min(2), action: z.enum(["change", "cancel", "resume"]).optional() });

export async function GET() {
  try {
    const session = await requireBusiness();
    const [{ plan, subscription }, plans, usage] = await Promise.all([
      getPlanForBusiness(session.businessId),
      getPlans(),
      getUsage(session.businessId),
    ]);
    return ok({ plan, subscription, plans, usage });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("billing.write");
    const body = await parseBody(request, schema);
    const plans = await getPlans();
    const target = plans.find((p) => p.code === body.planCode);
    if (!target) throw new AppError("That plan is not available.", 404, "not_found");

    const existing = await db.select().from(subscriptions).where(eq(subscriptions.businessId, session.businessId)).limit(1);
    const renewsAt = new Date(Date.now() + 30 * 864e5);

    if (body.action === "cancel") {
      await db.update(subscriptions).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(subscriptions.businessId, session.businessId));
      await track("subscription_cancelled", { plan: body.planCode }, session.businessId, session.user.id);
      await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: "cancelled the subscription" });
      return ok({ cancelled: true });
    }

    if (existing.length > 0) {
      await db
        .update(subscriptions)
        .set({ planCode: target.code, status: "active", renewsAt, cancelledAt: null })
        .where(eq(subscriptions.businessId, session.businessId));
    } else {
      await db.insert(subscriptions).values({ businessId: session.businessId, planCode: target.code, status: "active", renewsAt });
    }

    await track("subscription_changed", { plan: target.code }, session.businessId, session.user.id);
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `switched to the ${target.name} plan` });
    await notify({ businessId: session.businessId, type: "subscription", title: `${target.name} plan activated`, body: "Thank you for supporting BizFlow MY.", link: "/app/subscription" });
    return ok({ planCode: target.code });
  } catch (error) {
    return handleError(error);
  }
}
