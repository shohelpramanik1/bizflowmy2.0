import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses, memberships, products } from "@/db/schema";
import BookingClient from "./booking-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  return {
    title: business ? `Book an appointment with ${business.name}` : "Booking",
    description: business ? `Choose a service, pick a time and book online with ${business.name}.` : undefined,
  };
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [business] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
  if (!business || business.status !== "active" || !business.bookingEnabled) notFound();

  const services = await db
    .select({ id: products.id, name: products.name, priceCents: products.priceCents, durationMinutes: products.durationMinutes, description: products.description })
    .from(products)
    .where(and(eq(products.businessId, business.id), eq(products.bookable, true), eq(products.active, true)));

  const staff = await db
    .select({ id: memberships.id, name: memberships.name, position: memberships.position })
    .from(memberships)
    .where(and(eq(memberships.businessId, business.id), eq(memberships.status, "active")));

  return (
    <BookingClient
      slug={slug}
      business={{ name: business.name, logoUrl: business.logoUrl, address: business.address, phone: business.phone, currencySymbol: business.currencySymbol }}
      services={services}
      staff={staff.map((s) => ({ id: s.id, name: s.name ?? "Team member", position: s.position }))}
    />
  );
}
