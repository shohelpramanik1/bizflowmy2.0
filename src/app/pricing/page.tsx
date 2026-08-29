import Link from "next/link";
import type { Metadata } from "next";
import { DEFAULT_PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing — Invoice & Quotation Software Malaysia",
  description: "BizFlow MY pricing in Malaysian Ringgit. Free plan forever, Pro at RM29/month and Business at RM59/month. No contract, cancel anytime.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">B</span>
            <span className="text-lg font-extrabold text-slate-900">BizFlow<span className="text-brand-600">MY</span></span>
          </Link>
          <Link href="/register" className="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Start for free</Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Simple pricing in Ringgit</h1>
          <p className="mt-3 text-slate-600">No contract, no setup fees. Start free and upgrade only when your business grows.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {DEFAULT_PLANS.map((p) => {
            const highlighted = p.code === "pro";
            return (
              <div key={p.code} className={`rounded-2xl border p-7 ${highlighted ? "border-brand-500 shadow-xl lg:-translate-y-3" : "border-slate-200"}`}>
                <h2 className="text-lg font-black text-slate-900">{p.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
                <p className="mt-5 text-4xl font-black text-slate-900">RM{(p.priceCents / 100).toFixed(0)}<span className="text-sm font-medium text-slate-400">/month</span></p>
                <Link href="/register" className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-bold ${highlighted ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                  {p.code === "free" ? "Start for free" : `Choose ${p.name}`}
                </Link>
                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600"><span className="text-emerald-500">✓</span>{f}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          Prices in Malaysian Ringgit (MYR). Tax treatment should be verified against current Malaysian requirements.
        </p>
      </main>
    </div>
  );
}
