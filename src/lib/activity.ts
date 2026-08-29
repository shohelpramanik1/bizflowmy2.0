import { db } from "@/db";
import { activityLogs, analyticsEvents, notifications } from "@/db/schema";

export async function logActivity(params: {
  businessId: number;
  userId?: number | null;
  userName?: string | null;
  action: string;
  entityType?: string;
  entityId?: number;
  meta?: Record<string, unknown>;
}) {
  try {
    await db.insert(activityLogs).values({
      businessId: params.businessId,
      userId: params.userId ?? null,
      userName: params.userName ?? null,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      meta: params.meta ?? null,
    });
  } catch (error) {
    console.error("[bizflow] activity log failed", error);
  }
}

export async function notify(params: {
  businessId: number;
  userId?: number | null;
  type?: string;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    await db.insert(notifications).values({
      businessId: params.businessId,
      userId: params.userId ?? null,
      type: params.type ?? "info",
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    });
  } catch (error) {
    console.error("[bizflow] notification failed", error);
  }
}

export async function track(event: string, meta?: Record<string, unknown>, businessId?: number | null, userId?: number | null) {
  try {
    await db.insert(analyticsEvents).values({
      event,
      meta: meta ?? null,
      businessId: businessId ?? null,
      userId: userId ?? null,
    });
  } catch (error) {
    console.error("[bizflow] analytics failed", error);
  }
}
