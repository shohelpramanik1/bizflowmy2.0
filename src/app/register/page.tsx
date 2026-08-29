"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Select, apiRequest } from "@/components/ui";
import { BUSINESS_TYPES, MY_STATES } from "@/lib/format";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    businessName: "",
    businessType: "Freelancer / Solo",
    country: "Malaysia",
    state: "Selangor",
    currency: "MYR",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-xl">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">B</span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">BizFlow<span className="text-brand-600">MY</span></span>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
          <h1 className="text-xl font-bold text-slate-900">Create your free account</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">No credit card required. You will be running in under two minutes.</p>

          <form onSubmit={submit} className="space-y-4">
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input value={form.name} onChange={set("name")} required placeholder="Ahmad bin Ismail" />
              </Field>
              <Field label="Phone number">
                <Input value={form.phone} onChange={set("phone")} placeholder="012-345 6789" />
              </Field>
            </div>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={set("email")} required placeholder="you@company.com.my" />
            </Field>
            <Field label="Password" required hint="Minimum 8 characters">
              <Input type="password" value={form.password} onChange={set("password")} required minLength={8} placeholder="••••••••" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" required>
                <Input value={form.businessName} onChange={set("businessName")} required placeholder="Kreatif Studio Enterprise" />
              </Field>
              <Field label="Business type">
                <Select value={form.businessType} onChange={set("businessType")}>
                  {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Country">
                <Select value={form.country} onChange={set("country")}>
                  <option>Malaysia</option><option>Singapore</option><option>Brunei</option><option>Indonesia</option><option>Other</option>
                </Select>
              </Field>
              <Field label="State">
                <Select value={form.state} onChange={set("state")}>
                  {MY_STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Currency">
                <Select value={form.currency} onChange={set("currency")}>
                  <option value="MYR">MYR (RM)</option><option value="SGD">SGD (S$)</option><option value="USD">USD ($)</option>
                </Select>
              </Field>
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg">Create account &amp; continue</Button>
            <p className="text-center text-xs text-slate-400">
              By signing up you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
            </p>
            <p className="text-center text-sm text-slate-500">
              Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
