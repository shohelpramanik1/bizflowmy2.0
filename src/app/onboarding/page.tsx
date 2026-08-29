import Link from "next/link";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, memberships, products, quotations } from "@/db/schema";
import { getSession } from "@/lib/auth";
import SetupWizard from "./setup-wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.business) redirect("/register");
  const bid = session.businessId;
  const b = session.business;

  const [[cus], [prd], [quo], [inv], [team]] = await Promise.all([
    db.select({ n: count() }).from(customers).where(and(eq(customers.businessId, bid), eq(customers.archived, false))),
    db.select({ n: count() }).from(products).where(eq(products.businessId, bid)),
    db.select({ n: count() }).from(quotations).where(eq(quotations.businessId, bid)),
    db.select({ n: count() }).from(invoices).where(eq(invoices.businessId, bid)),
    db.select({ n: count() }).from(memberships).where(eq(memberships.businessId, bid)),
  ]);

  const steps = [
    { label: "Complete your business profile", done: Boolean(b.address && b.phone && b.registrationNo), href: "/app/settings" },
    { label: "Add your first customer", done: (cus?.n ?? 0) > 0, href: "/app/customers" },
    { label: "Add a product or service", done: (prd?.n ?? 0) > 0, href: "/app/products" },
    { label: "Create your first quotation", done: (quo?.n ?? 0) > 0, href: "/app/quotations/new" },
    { label: "Create your first invoice", done: (inv?.n ?? 0) > 0, href: "/app/invoices/new" },
    { label: "Invite a team member", done: (team?.n ?? 0) > 1, href: "/app/team" },
    { label: "Configure online booking", done: Boolean(b.bookingEnabled && b.setupCompleted), href: "/app/bookings" },
    { label: "Set payment terms & bank details", done: Boolean(b.bankInfo), href: "/app/settings" },
  ];
  const completed = steps.filter((s) => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">B</span>
            <span className="text-lg font-extrabold text-slate-900">BizFlow<span className="text-brand-600">MY</span></span>
          </Link>
          <Link href="/app" className="text-sm font-semibold text-brand-700 hover:underline">Skip to dashboard →</Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          <h1 className="text-2xl font-black text-slate-900">Let&apos;s set up {b.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Everything here is optional — you can complete it later from Settings.</p>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-800">Your setup is {percent}% complete</span>
              <span className="text-slate-500">{completed}/{steps.length} steps</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <ul className="mt-5 space-y-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/40">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.done ? "bg-emerald-500 text-white" : "border-2 border-slate-300 text-slate-400"}`}>
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={`flex-1 text-sm font-medium ${s.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{s.label}</span>
                  <span className="text-xs font-semibold text-brand-600">{s.done ? "Done" : "Go →"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <SetupWizard
          initial={{
            name: b.name, logoUrl: b.logoUrl ?? "", registrationNo: b.registrationNo ?? "", address: b.address ?? "",
            phone: b.phone ?? "", email: b.email ?? "", website: b.website ?? "",
            defaultPaymentTerms: b.defaultPaymentTerms ?? "Payment due within 30 days",
            quotationTemplate: b.quotationTemplate, invoiceTemplate: b.invoiceTemplate,
          }}
        />
      </div>
    </div>
  );
}
