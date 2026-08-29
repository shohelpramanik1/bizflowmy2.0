import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, memberships, quotations, subscriptionPlans, subscriptions } from "@/db/schema";
import { AppError } from "./api";

export type PlanLimits = { invoices: number; quotations: number; customers: number; team: number };

export const DEFAULT_PLANS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    tagline: "Get started with the basics",
    sortOrder: 1,
    limits: { invoices: 5, quotations: 5, customers: 20, team: 1 } satisfies PlanLimits,
    features: [
      "5 invoices / month",
      "5 quotations / month",
      "20 customers",
      "Basic dashboard",
      "Basic PDF templates",
      "1 user",
    ],
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 2900,
    tagline: "For growing freelancers & small teams",
    sortOrder: 2,
    limits: { invoices: -1, quotations: -1, customers: 500, team: 3 } satisfies PlanLimits,
    features: [
      "Unlimited quotations",
      "Unlimited invoices",
      "500 customers",
      "Expense management",
      "Task manager & Kanban",
      "Booking system",
      "Reports & exports",
      "Email + WhatsApp sharing",
      "3 team members",
      "Advanced templates",
    ],
  },
  {
    code: "business",
    name: "Business",
    priceCents: 5900,
    tagline: "For SMEs running a full operation",
    sortOrder: 3,
    limits: { invoices: -1, quotations: -1, customers: -1, team: 10 } satisfies PlanLimits,
    features: [
      "Everything in Pro",
      "Unlimited customers",
      "Unlimited documents",
      "10+ team members",
      "Advanced reports",
      "Multiple staff scheduling",
      "Advanced booking",
      "Automated payment reminders",
      "Custom branding",
      "Priority support",
    ],
  },
];

export async function getPlans() {
  const rows = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.active, true));
  if (rows.length > 0) return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  return DEFAULT_PLANS.map((p, i) => ({
    id: i + 1,
    code: p.code,
    name: p.name,
    priceCents: p.priceCents,
    interval: "month",
    tagline: p.tagline,
    features: p.features,
    limits: p.limits,
    sortOrder: p.sortOrder,
    active: true,
  }));
}

export async function getSubscription(businessId: number) {
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.businessId, businessId)).limit(1);
  return rows[0] ?? null;
}

export async function getPlanForBusiness(businessId: number) {
  const sub = await getSubscription(businessId);
  const plans = await getPlans();
  const code = sub?.planCode ?? "free";
  const plan = plans.find((p) => p.code === code) ?? plans[0];
  return { subscription: sub, plan };
}

function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export type UsageSnapshot = {
  invoicesThisMonth: number;
  quotationsThisMonth: number;
  customers: number;
  team: number;
};

export async function getUsage(businessId: number): Promise<UsageSnapshot> {
  const start = monthStart();
  const [inv] = await db
    .select({ n: count() })
    .from(invoices)
    .where(and(eq(invoices.businessId, businessId), gte(invoices.createdAt, start)));
  const [quo] = await db
    .select({ n: count() })
    .from(quotations)
    .where(and(eq(quotations.businessId, businessId), gte(quotations.createdAt, start)));
  const [cus] = await db
    .select({ n: count() })
    .from(customers)
    .where(and(eq(customers.businessId, businessId), eq(customers.archived, false)));
  const [tm] = await db
    .select({ n: count() })
    .from(memberships)
    .where(and(eq(memberships.businessId, businessId), eq(memberships.status, "active")));
  return {
    invoicesThisMonth: inv?.n ?? 0,
    quotationsThisMonth: quo?.n ?? 0,
    customers: cus?.n ?? 0,
    team: tm?.n ?? 0,
  };
}

/** Server-side enforcement of subscription limits (business rule #12). */
export async function assertWithinLimit(businessId: number, resource: keyof PlanLimits) {
  const { plan } = await getPlanForBusiness(businessId);
  const limits = plan.limits as PlanLimits;
  const limit = limits[resource];
  if (limit === undefined || limit < 0) return;
  const usage = await getUsage(businessId);
  const current =
    resource === "invoices" ? usage.invoicesThisMonth
    : resource === "quotations" ? usage.quotationsThisMonth
    : resource === "customers" ? usage.customers
    : usage.team;
  if (current >= limit) {
    throw new AppError(
      `You have reached your ${plan.name} plan limit for ${resource} (${limit}). Upgrade your plan to continue.`,
      402,
      "plan_limit",
    );
  }
}
