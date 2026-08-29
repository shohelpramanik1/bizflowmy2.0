import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, memberships, subscriptions } from "@/db/schema";
import { handleError, ok, parseBody, requireBusiness, requireSession } from "@/lib/api";
import { slugify, switchBusiness } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const createSchema = z.object({
  name: z.string().min(2),
  businessType: z.string().optional(),
  state: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  businessType: z.string().nullable().optional(),
  registrationNo: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postcode: z.string().nullable().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  currencySymbol: z.string().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  defaultPaymentTerms: z.string().nullable().optional(),
  paymentTermDays: z.number().int().min(0).max(365).optional(),
  quotationTemplate: z.string().optional(),
  invoiceTemplate: z.string().optional(),
  taxEnabled: z.boolean().optional(),
  taxLabel: z.string().optional(),
  taxRateBp: z.number().int().min(0).max(10000).optional(),
  bankInfo: z.string().nullable().optional(),
  quotationTerms: z.string().nullable().optional(),
  invoiceNotes: z.string().nullable().optional(),
  paymentGateway: z.string().nullable().optional(),
  gatewayConfig: z.record(z.string(), z.string()).optional(),
  reminderSettings: z.object({ stages: z.array(z.number()), auto: z.boolean() }).optional(),
  bookingEnabled: z.boolean().optional(),
  setupCompleted: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireBusiness();
    return ok({ business: session.business });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await parseBody(request, createSchema);
    let slug = slugify(body.name);
    const clash = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, slug)).limit(1);
    if (clash.length > 0) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const [business] = await db
      .insert(businesses)
      .values({
        ownerId: session.user.id,
        name: body.name.trim(),
        slug,
        businessType: body.businessType ?? "Services",
        state: body.state ?? null,
        email: session.user.email,
        reminderSettings: { stages: [-3, 0, 3, 7, 14], auto: true },
      })
      .returning();

    await db.insert(memberships).values({
      businessId: business.id,
      userId: session.user.id,
      name: session.user.name,
      role: "owner",
      status: "active",
    });
    await db.insert(subscriptions).values({ businessId: business.id, planCode: "free", status: "active" });
    await switchBusiness(session.sessionId, business.id);
    return ok({ business });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireBusiness("settings.write");
    const body = await parseBody(request, updateSchema);
    const [updated] = await db.update(businesses).set(body).where(eq(businesses.id, session.businessId)).returning();
    await logActivity({
      businessId: session.businessId,
      userId: session.user.id,
      userName: session.user.name,
      action: "updated business settings",
      entityType: "business",
      entityId: session.businessId,
    });
    return ok({ business: updated });
  } catch (error) {
    return handleError(error);
  }
}
