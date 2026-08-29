import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { businesses, memberships, sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "bizflow_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || `biz-${createHash("md5").update(input).digest("hex").slice(0, 6)}`
  );
}

export async function createSession(userId: number, activeBusinessId: number | null) {
  const id = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  await db.insert(sessions).values({ id, userId, activeBusinessId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return id;
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  store.delete(SESSION_COOKIE);
}

export type Role = "owner" | "admin" | "manager" | "staff" | "accountant" | "sales";

export type SessionContext = {
  sessionId: string;
  user: typeof users.$inferSelect;
  business: typeof businesses.$inferSelect | null;
  membership: typeof memberships.$inferSelect | null;
  role: Role;
  businessId: number;
};

export async function getSession(): Promise<SessionContext | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const session = rows[0];
  if (!session) return null;

  const userRows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const user = userRows[0];
  if (!user || user.status !== "active") return null;

  const mine = await db
    .select({ m: memberships, b: businesses })
    .from(memberships)
    .innerJoin(businesses, eq(businesses.id, memberships.businessId))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "active")));

  if (mine.length === 0) {
    return {
      sessionId: id,
      user,
      business: null,
      membership: null,
      role: "owner",
      businessId: 0,
    };
  }

  const picked = mine.find((r) => r.b.id === session.activeBusinessId) ?? mine[0];
  return {
    sessionId: id,
    user,
    business: picked.b,
    membership: picked.m,
    role: (picked.m.role as Role) ?? "staff",
    businessId: picked.b.id,
  };
}

export async function listUserBusinesses(userId: number) {
  return db
    .select({ id: businesses.id, name: businesses.name, slug: businesses.slug, role: memberships.role })
    .from(memberships)
    .innerJoin(businesses, eq(businesses.id, memberships.businessId))
    .where(and(eq(memberships.userId, userId), eq(memberships.status, "active")));
}

export async function switchBusiness(sessionId: string, businessId: number) {
  await db.update(sessions).set({ activeBusinessId: businessId }).where(eq(sessions.id, sessionId));
}
