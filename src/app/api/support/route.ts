import { z } from "zod";
import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { getSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(3, "Add a short subject"),
  message: z.string().min(10, "Tell us a bit more so we can help"),
});

export async function POST(request: Request) {
  try {
    rateLimit(`support:${request.headers.get("x-forwarded-for") ?? "local"}`, 6, 60_000);
    const body = await parseBody(request, schema);
    const session = await getSession();
    await db.insert(supportTickets).values({
      ...body,
      userId: session?.user.id ?? null,
      businessId: session?.business?.id ?? null,
    });
    return ok({ submitted: true }, 201);
  } catch (error) {
    return handleError(error);
  }
}
