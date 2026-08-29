import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ ok: true, status: "healthy", service: "bizflow-my", timestamp: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false, status: "degraded", service: "bizflow-my" }, { status: 503 });
  }
}
