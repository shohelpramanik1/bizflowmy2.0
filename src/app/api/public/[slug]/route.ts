import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, businesses, customers, memberships, products } from "@/db/schema";
import { AppError, handleError, ok, parseBody, rateLimit } from "@/lib/api";
import { notify } from "@/lib/activity";
import { randomToken } from "@/lib/auth";

const schema = z.object({
  productId: z.number().int().positive().nullable().optional(),
  staffMembershipId: z.number().int().positive().nullable().optional(),
  bookingDate: z.string().min(8),
  startTime: z.string().min(4),
  name: z.string().min(2, "Please enter your name"),
  phone: z.string().min(6, "Please enter a contact number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    if (!business || business.status !== "active" || !business.bookingEnabled) {
      throw new AppError("This booking page is not available.", 404, "not_found");
    }
    const services = await db
      .select({ id: products.id, name: products.name, priceCents: products.priceCents, durationMinutes: products.durationMinutes, description: products.description })
      .from(products)
      .where(and(eq(products.businessId, business.id), eq(products.bookable, true), eq(products.active, true)));
    const staff = await db
      .select({ id: memberships.id, name: memberships.name, position: memberships.position })
      .from(memberships)
      .where(and(eq(memberships.businessId, business.id), eq(memberships.status, "active")));
    return ok({
      business: { id: business.id, name: business.name, slug: business.slug, logoUrl: business.logoUrl, address: business.address, phone: business.phone, currencySymbol: business.currencySymbol },
      services,
      staff,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    rateLimit(`booking:${slug}:${request.headers.get("x-forwarded-for") ?? "local"}`, 8, 60_000);
    const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
    if (!business || !business.bookingEnabled) throw new AppError("This booking page is not available.", 404, "not_found");

    const body = await parseBody(request, schema);

    let duration = 60;
    let serviceName: string | null = null;
    if (body.productId) {
      const [service] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, body.productId), eq(products.businessId, business.id)))
        .limit(1);
      if (service) {
        duration = service.durationMinutes ?? 60;
        serviceName = service.name;
      }
    }

    // Attach to an existing customer record when the phone matches, otherwise create one.
    let customerId: number | null = null;
    const [existing] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.businessId, business.id), eq(customers.phone, body.phone)))
      .limit(1);
    if (existing) {
      customerId = existing.id;
    } else {
      const [created] = await db
        .insert(customers)
        .values({
          businessId: business.id,
          name: body.name,
          phone: body.phone,
          whatsapp: body.phone,
          email: body.email || null,
          country: "Malaysia",
          notes: "Created from the public booking page",
          portalToken: randomToken(18),
        })
        .returning();
      customerId = created.id;
    }

    const [booking] = await db
      .insert(bookings)
      .values({
        businessId: business.id,
        customerId,
        customerName: body.name,
        customerPhone: body.phone,
        customerEmail: body.email || null,
        productId: body.productId ?? null,
        serviceName,
        staffMembershipId: body.staffMembershipId ?? null,
        bookingDate: body.bookingDate,
        startTime: body.startTime,
        endTime: addMinutes(body.startTime, duration),
        notes: body.notes ?? null,
        status: "pending",
        source: "public",
      })
      .returning();

    await notify({
      businessId: business.id,
      type: "booking",
      title: "New online booking 🗓️",
      body: `${body.name} booked ${serviceName ?? "an appointment"} on ${body.bookingDate} at ${body.startTime}.`,
      link: "/app/bookings",
    });

    return ok({ booking: { id: booking.id, date: booking.bookingDate, start: booking.startTime, end: booking.endTime, service: serviceName } }, 201);
  } catch (error) {
    return handleError(error);
  }
}
