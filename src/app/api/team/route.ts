import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberships, users } from "@/db/schema";
import { AppError, handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { assertWithinLimit } from "@/lib/plans";
import { logActivity, notify } from "@/lib/activity";
import { hashPassword } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().nullable().optional(),
  role: z.enum(["owner", "admin", "manager", "staff", "accountant", "sales"]),
  position: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  tempPassword: z.string().min(8, "Temporary password must be at least 8 characters").optional(),
});

export async function GET() {
  try {
    const session = await requireBusiness("team.read");
    const items = await db
      .select({ membership: memberships, userEmail: users.email, userName: users.name })
      .from(memberships)
      .leftJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.businessId, session.businessId));
    return ok({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("team.write");
    await assertWithinLimit(session.businessId, "team");
    const body = await parseBody(request, schema);
    const email = body.email.toLowerCase().trim();

    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId = existingUser?.id ?? null;

    if (!userId) {
      const [created] = await db
        .insert(users)
        .values({ name: body.name, email, passwordHash: hashPassword(body.tempPassword ?? `Bizflow${Date.now()}`), phone: body.phone ?? null })
        .returning();
      userId = created.id;
    }

    const dupe = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(and(eq(memberships.businessId, session.businessId), eq(memberships.userId, userId)))
      .limit(1);
    if (dupe.length > 0) throw new AppError("This person is already part of your team.", 409, "duplicate");

    const [member] = await db
      .insert(memberships)
      .values({
        businessId: session.businessId,
        userId,
        inviteEmail: email,
        name: body.name,
        phone: body.phone ?? null,
        role: body.role,
        position: body.position ?? null,
        department: body.department ?? null,
        status: "active",
      })
      .returning();

    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `invited ${body.name} as ${body.role}`, entityType: "membership", entityId: member.id });
    await notify({ businessId: session.businessId, type: "team", title: "Team member invited", body: `${body.name} joined as ${body.role}.`, link: "/app/team" });
    return ok({ member }, 201);
  } catch (error) {
    return handleError(error);
  }
}
