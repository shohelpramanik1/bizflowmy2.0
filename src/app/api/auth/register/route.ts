import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, memberships, subscriptions, users } from "@/db/schema";
import { AppError, handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { createSession, hashPassword, slugify } from "@/lib/auth";
import { logActivity, notify, track } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional().default(""),
  businessName: z.string().min(2, "Enter your business name"),
  businessType: z.string().optional().default("Freelancer / Solo"),
  country: z.string().optional().default("Malaysia"),
  state: z.string().optional().default("Selangor"),
  currency: z.string().optional().default("MYR"),
});

export async function POST(request: Request) {
  try {
    rateLimit(`register:${request.headers.get("x-forwarded-for") ?? "local"}`, 10, 60_000);
    const body = await parseBody(request, schema);
    const email = body.email.toLowerCase().trim();

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) throw new AppError("An account with this email already exists.", 409, "email_taken");

    const [user] = await db
      .insert(users)
      .values({ name: body.name.trim(), email, passwordHash: hashPassword(body.password), phone: body.phone || null })
      .returning();

    let slug = slugify(body.businessName);
    const clash = await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, slug)).limit(1);
    if (clash.length > 0) slug = `${slug}-${user.id}`;

    const symbol = body.currency === "MYR" ? "RM" : body.currency === "SGD" ? "S$" : body.currency === "USD" ? "$" : body.currency;

    const [business] = await db
      .insert(businesses)
      .values({
        ownerId: user.id,
        name: body.businessName.trim(),
        slug,
        businessType: body.businessType,
        country: body.country,
        state: body.state,
        currency: body.currency,
        currencySymbol: symbol,
        email,
        phone: body.phone || null,
        reminderSettings: { stages: [-3, 0, 3, 7, 14], auto: true },
      })
      .returning();

    await db.insert(memberships).values({
      businessId: business.id,
      userId: user.id,
      name: user.name,
      role: "owner",
      position: "Founder",
      status: "active",
    });

    await db.insert(subscriptions).values({ businessId: business.id, planCode: "free", status: "active" });

    await createSession(user.id, business.id);
    await logActivity({ businessId: business.id, userId: user.id, userName: user.name, action: "created the business workspace", entityType: "business", entityId: business.id });
    await notify({ businessId: business.id, userId: user.id, type: "welcome", title: "Welcome to BizFlow MY 🎉", body: "Complete your business setup to unlock professional documents.", link: "/onboarding" });
    await track("user_registered", { businessType: body.businessType }, business.id, user.id);

    return ok({ userId: user.id, businessId: business.id, slug });
  } catch (error) {
    return handleError(error);
  }
}
