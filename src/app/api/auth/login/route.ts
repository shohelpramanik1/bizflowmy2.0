import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AppError, handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { createSession, listUserBusinesses, verifyPassword } from "@/lib/auth";
import { track } from "@/lib/activity";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    rateLimit(`login:${ip}`, 15, 60_000);
    const body = await parseBody(request, schema);
    const email = body.email.toLowerCase().trim();

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw new AppError("Incorrect email or password.", 401, "invalid_credentials");
    }
    if (user.status !== "active") throw new AppError("This account has been suspended. Please contact support.", 403, "suspended");

    const list = await listUserBusinesses(user.id);
    await createSession(user.id, list[0]?.id ?? null);
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    await track("user_login", {}, list[0]?.id ?? null, user.id);

    return ok({ userId: user.id, hasBusiness: list.length > 0, isPlatformAdmin: user.isPlatformAdmin });
  } catch (error) {
    return handleError(error);
  }
}
