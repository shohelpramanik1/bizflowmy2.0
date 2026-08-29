import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getSession, type SessionContext } from "./auth";
import { can, type Capability } from "./rbac";

export class AppError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400, code = "bad_request") {
  return NextResponse.json({ ok: false, error: { message, code } }, { status });
}

/** Never leak database/internal errors to the client. */
export function handleError(error: unknown) {
  if (error instanceof AppError) return fail(error.message, error.status, error.code);
  if (error instanceof ZodError) {
    const first = error.issues[0];
    return fail(first ? `${first.path.join(".") || "Field"}: ${first.message}` : "Invalid input.", 422, "validation_error");
  }
  console.error("[bizflow] unhandled error:", error);
  return fail("Something went wrong. Please try again.", 500, "server_error");
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new AppError("You need to sign in to continue.", 401, "unauthenticated");
  return session;
}

export async function requireBusiness(capability?: Capability): Promise<SessionContext & { businessId: number }> {
  const session = await requireSession();
  if (!session.business) throw new AppError("Create your business workspace first.", 403, "no_business");
  if (capability && !can(session.role, capability)) {
    throw new AppError("Your role does not allow this action.", 403, "forbidden");
  }
  return session as SessionContext & { businessId: number };
}

export async function requirePlatformAdmin(): Promise<SessionContext> {
  const session = await requireSession();
  if (!session.user.isPlatformAdmin) throw new AppError("Administrator access required.", 403, "forbidden");
  return session;
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new AppError("Invalid request body.", 400);
  }
  return schema.parse(raw);
}

export function pagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const rawSize = Number(url.searchParams.get("pageSize") ?? 25) || 25;
  const pageSize = Math.min(100, Math.max(5, rawSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** Simple in-memory rate limiter (per process). */
const buckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) throw new AppError("Too many attempts. Please wait a moment and try again.", 429, "rate_limited");
}
