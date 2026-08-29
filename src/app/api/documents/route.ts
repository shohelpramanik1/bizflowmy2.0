import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, documents } from "@/db/schema";
import { handleError, ok, parseBody, requireBusiness } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().min(1, "Document name is required"),
  type: z.string().optional(),
  url: z.string().url("Provide a valid link").nullable().optional().or(z.literal("")),
  customerId: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  sizeBytes: z.number().int().min(0).nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("documents.read");
    const url = new URL(request.url);
    const filters = [eq(documents.businessId, session.businessId)];
    const type = url.searchParams.get("type");
    if (type && type !== "all") filters.push(eq(documents.type, type));
    const customerId = url.searchParams.get("customerId");
    if (customerId) filters.push(eq(documents.customerId, Number(customerId)));

    const items = await db
      .select({ document: documents, customerName: customers.name })
      .from(documents)
      .leftJoin(customers, eq(customers.id, documents.customerId))
      .where(and(...filters))
      .orderBy(desc(documents.createdAt))
      .limit(200);
    return ok({ items });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireBusiness("documents.write");
    const body = await parseBody(request, schema);
    const [row] = await db
      .insert(documents)
      .values({ ...body, url: body.url || null, businessId: session.businessId, type: body.type ?? "other", uploadedBy: session.user.id })
      .returning();
    await logActivity({ businessId: session.businessId, userId: session.user.id, userName: session.user.name, action: `uploaded document ${row.name}`, entityType: "document", entityId: row.id });
    return ok({ document: row }, 201);
  } catch (error) {
    return handleError(error);
  }
}
