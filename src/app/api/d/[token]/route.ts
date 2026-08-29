import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quotations } from "@/db/schema";
import { AppError, handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { notify } from "@/lib/activity";

const schema = z.object({ action: z.enum(["accept", "reject"]) });

/** Public quotation decision endpoint used by the customer portal link. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    rateLimit(`decide:${token}`, 10, 60_000);
    const body = await parseBody(request, schema);
    const [quotation] = await db.select().from(quotations).where(eq(quotations.publicToken, token)).limit(1);
    if (!quotation) throw new AppError("This document link is no longer valid.", 404, "not_found");
    if (["accepted", "rejected", "converted"].includes(quotation.status)) {
      throw new AppError("A decision has already been recorded for this quotation.", 409, "already_decided");
    }

    const status = body.action === "accept" ? "accepted" : "rejected";
    await db.update(quotations).set({ status, updatedAt: new Date() }).where(eq(quotations.id, quotation.id));
    await notify({
      businessId: quotation.businessId,
      type: "quotation",
      title: `Quotation ${quotation.number} ${status}`,
      body: status === "accepted" ? "Your customer accepted online — convert it to an invoice." : "Your customer declined this quotation.",
      link: `/app/quotations/${quotation.id}`,
    });
    return ok({ status });
  } catch (error) {
    return handleError(error);
  }
}
