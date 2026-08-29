import Link from "next/link";
import type { Metadata } from "next";
import { DEFAULT_PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Invoice & Quotation Software Malaysia | BizFlow MY",
  description:
    "Create quotations, send invoices in RM, track payments, manage customers, tasks, bookings and your team. Built for Malaysian freelancers, service providers and SMEs. Free plan available.",
};

const FEATURES = [
  { icon: "📄", title: "Quotations", body: "Professional quotes with auto numbering (QT-2026-0001), expiry dates and one-click conversion to invoices." },
  { icon: "🧾", title: "Invoices", body: "Server-calculated totals, SST-ready tax fields, payment terms and bank details on every invoice." },
  { icon: "💳", title: "Payments", body: "Record full or partial payments. Invoice status updates itself — paid, partially paid or overdue." },
  { icon: "👥", title: "Customers", body: "A simple CRM with contact details, transaction history, outstanding balances and related tasks." },
  { icon: "📉", title: "Expenses", body: "Track spending by category so your dashboard always shows real net profit." },
  { icon: "✅", title: "Tasks", body: "List and Kanban views with drag-and-drop, priorities, due dates and customer links." },
  { icon: "📅", title: "Bookings", body: "Day, week and month calendar plus a public booking page your customers can use." },
  { icon: "🧑‍🤝‍🧑", title: "Team", body: "Invite staff with roles — owner, admin, manager, staff, accountant or sales." },
  { icon: "📊", title: "Reports", body: "Sales, invoice, expense, profit & loss, customer and product reports with CSV export." },
];

const STEPS = [
  "Create your business workspace",
  "Add your customers",
  "Create a quotation",
  "Convert the quotation to an invoice",
  "Record the payment",
  "Manage tasks and bookings",
  "Grow your business with reports",
];

const TESTIMONIALS = [
  { name: "Aisyah Rahman", role: "Freelance Designer, Shah Alam", quote: "I used to build quotations in Word. Now I send a quote, the client accepts, and it becomes an invoice in one click. Saves me hours every week." },
  { name: "Lim Wei Chun", role: "Founder, Vertex Renovation Sdn Bhd", quote: "The overdue tracking alone paid for the plan. We finally know exactly who owes us what — and the WhatsApp reminder is very Malaysian-friendly." },
  { name: "Rajesh Kumar", role: "Owner, KL Auto Care", quote: "My staff take bookings from the public page, and I see everything in the calendar. No more double bookings." },
];

const FAQ = [
  { q: "Is there a free plan?", a: "Yes. The Free plan gives you 5 invoices and 5 quotations per month, up to 20 customers and 1 user — no credit card required." },
  { q: "Can I create unlimited invoices?", a: "Unlimited invoices and quotations are included in the Pro (RM29/month) and Business (RM59/month) plans." },
  { q: "Can I send invoices through WhatsApp?", a: "Yes. Every invoice and quotation has a Send via WhatsApp button that pre-fills a professional message with a secure document link instead of exposing sensitive details in the URL." },
  { q: "Can multiple employees use the account?", a: "Yes. Pro includes 3 team members, Business includes 10+. Each member gets a role that controls exactly what they can see." },
  { q: "Can customers book appointments?", a: "Yes. Each business gets a public booking page where customers pick a service, staff member, date and time. You get notified instantly." },
  { q: "Can I export reports?", a: "Every report can be exported to CSV, and every document can be exported as a print-ready PDF." },
  { q: "Can I cancel anytime?", a: "Yes. There is no contract — cancel from Settings → Subscription and you keep access until the end of the billing period." },
];

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BizFlow MY",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Quotation, invoice, task, booking and business management software for Malaysian freelancers and SMEs.",
    offers: DEFAULT_PLANS.map((p) => ({ "@type": "Offer", name: p.name, price: (p.priceCents / 100).toFixed(2), priceCurrency: "MYR" })),
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "126" },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">B</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">BizFlow<span className="text-brand-600">MY</span></span>
          </Link>
          <nav className="ml-6 hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-brand-700">Features</a>
            <a href="#how" className="hover:text-brand-700">How it works</a>
            <a href="#pricing" className="hover:text-brand-700">Pricing</a>
            <a href="#faq" className="hover:text-brand-700">FAQ</a>
            <Link href="/help" className="hover:text-brand-700">Help</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Sign in</Link>
            <Link href="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">Start for free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                🇲🇾 Built for Malaysian freelancers &amp; SMEs
              </span>
              <h1 className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Run your business without the admin headache
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Create quotations, send invoices, track payments, manage customers, organise tasks, accept bookings, and manage your team — all from one simple platform.
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                Quotations · Invoices · Tasks · Bookings · Teams · All in one place
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700">
                  Start for free →
                </Link>
                <Link href="/login?demo=1" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-7 py-3.5 text-base font-bold text-slate-700 transition hover:bg-slate-50">
                  View demo
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-500">No credit card required · Free plan forever · Cancel anytime</p>
            </div>

            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total revenue", value: "RM 25,480", tone: "text-brand-700 bg-brand-50" },
                    { label: "Outstanding", value: "RM 8,250", tone: "text-amber-700 bg-amber-50" },
                    { label: "Overdue", value: "RM 2,450", tone: "text-rose-700 bg-rose-50" },
                    { label: "Net profit", value: "RM 17,630", tone: "text-emerald-700 bg-emerald-50" },
                  ].map((c) => (
                    <div key={c.label} className={`rounded-xl p-3 ${c.tone}`}>
                      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{c.label}</p>
                      <p className="mt-1 text-lg font-black">{c.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-slate-100 p-3">
                  <div className="flex items-end gap-1.5" style={{ height: 96 }}>
                    {[35, 52, 44, 68, 58, 82, 74, 95, 66, 88, 79, 100].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-300 to-brand-600" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Monthly sales · 2026</p>
                </div>
                <div className="mt-3 space-y-1.5">
                  {[
                    { n: "INV-2026-0021", c: "ABC Construction", s: "Paid", tone: "bg-emerald-100 text-emerald-700" },
                    { n: "INV-2026-0022", c: "Nusantara Cafe", s: "Overdue", tone: "bg-rose-100 text-rose-700" },
                    { n: "QT-2026-0034", c: "Sinar Digital", s: "Accepted", tone: "bg-brand-100 text-brand-700" },
                  ].map((r) => (
                    <div key={r.n} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-bold text-slate-700">{r.n}</span>
                      <span className="truncate text-slate-500">{r.c}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${r.tone}`}>{r.s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Everything your business needs</h2>
          <p className="mt-3 text-slate-600">Stop juggling WhatsApp, Excel and Word documents. BizFlow MY replaces all of it with one clean workspace.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-xl">{f.icon}</div>
              <h3 className="mt-4 text-base font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-slate-200 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">How it works</h2>
            <p className="mt-3 text-slate-600">From first quote to money in the bank — seven simple steps.</p>
          </div>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s} className="relative rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">{i + 1}</span>
                <p className="mt-3 text-sm font-semibold leading-snug text-slate-800">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Simple pricing in Ringgit</h2>
          <p className="mt-3 text-slate-600">Start free. Upgrade only when your business grows.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {DEFAULT_PLANS.map((p) => {
            const highlighted = p.code === "pro";
            return (
              <div
                key={p.code}
                className={`relative rounded-2xl border p-7 ${highlighted ? "border-brand-500 bg-white shadow-xl shadow-brand-600/10 lg:-translate-y-3" : "border-slate-200 bg-white"}`}
              >
                {highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Most popular</span>
                )}
                <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">RM{(p.priceCents / 100).toFixed(0)}</span>
                  <span className="text-sm font-medium text-slate-500">/month</span>
                </p>
                <Link
                  href="/register"
                  className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-bold transition ${highlighted ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                >
                  {p.code === "free" ? "Start for free" : `Choose ${p.name}`}
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="mt-0.5 shrink-0 text-emerald-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-slate-200 bg-slate-900 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-black tracking-tight text-white sm:text-4xl">Loved by Malaysian business owners</h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="text-amber-400">★★★★★</div>
                <blockquote className="mt-3 text-sm leading-relaxed text-slate-200">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-8 text-center text-[11px] text-slate-500">Placeholder testimonials shown during development.</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <h2 className="text-center text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-5 open:border-brand-300 open:shadow-sm">
              <summary className="cursor-pointer list-none text-sm font-bold text-slate-900 marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-brand-600 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-brand-700 to-brand-500 px-8 py-14 text-center shadow-xl">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to get paid faster?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">Join Malaysian freelancers and SMEs who replaced spreadsheets with BizFlow MY.</p>
          <Link href="/register" className="mt-7 inline-flex rounded-xl bg-white px-8 py-3.5 text-base font-bold text-brand-700 shadow-lg transition hover:bg-brand-50">
            Create your free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">B</span>
              <span className="font-extrabold text-slate-900">BizFlow MY</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Quotation, invoice, task and business management software for Malaysian freelancers, service providers and SMEs.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><a href="#features" className="hover:text-brand-700">Features</a></li>
              <li><a href="#pricing" className="hover:text-brand-700">Pricing</a></li>
              <li><Link href="/register" className="hover:text-brand-700">Start free</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Support</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/help" className="hover:text-brand-700">Help Center</Link></li>
              <li><Link href="/help#contact" className="hover:text-brand-700">Contact support</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/privacy" className="hover:text-brand-700">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-brand-700">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-6xl border-t border-slate-100 px-4 pt-6 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} BizFlow MY. Prices in Malaysian Ringgit (MYR).</p>
          <p className="mt-2">
            Tax fields are fully configurable. BizFlow MY does not provide tax or legal advice — please verify tax treatment and compliance against current Malaysian requirements (LHDN / RMCD).
          </p>
        </div>
      </footer>
    </div>
  );
}
