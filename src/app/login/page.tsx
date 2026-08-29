"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Field, Input, apiRequest } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const demo = params.get("demo") === "1";
  const [email, setEmail] = useState(demo ? "demo@bizflowmy.com" : "");
  const [password, setPassword] = useState(demo ? "demo12345" : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<{ hasBusiness: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(data.hasBusiness ? "/app" : "/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {demo && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs text-brand-800">
          <strong>Demo workspace</strong> — credentials pre-filled. Explore a fully populated Malaysian business account.
        </div>
      )}
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}
      <Field label="Email" required>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com.my" autoComplete="email" />
      </Field>
      <Field label="Password" required>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password" />
      </Field>
      <Button type="submit" loading={loading} className="w-full" size="lg">Sign in</Button>
      <p className="text-center text-sm text-slate-500">
        New to BizFlow MY?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:underline">Create a free account</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">B</span>
          <span className="text-xl font-extrabold tracking-tight text-slate-900">BizFlow<span className="text-brand-600">MY</span></span>
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
          <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to your business workspace.</p>
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-slate-100" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
