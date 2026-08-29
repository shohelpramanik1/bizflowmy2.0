"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, CardHeader, apiRequest, cx, useToast } from "@/components/ui";

type Plan = { code: string; name: string; priceCents: number; tagline: string | null; features: string[]; limits: { invoices: number; quotations: number; customers: number; team: number } };
type Data = { plan: Plan; subscription: { planCode: string; status: string; renewsAt: string | null } | null; plans: Plan[]; usage: { invoicesThisMonth: number; quotationsThisMonth: number; customers: number; team: number } };

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit < 0 ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{used} / {limit < 0 ? "∞" : limit}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cx("h-full rounded-full transition-all", pct > 85 ? "bg-rose-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${limit < 0 ? 6 : pct}%` }} />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const { push } = useToast();
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const d = await apiRequest<Data>("/api/subscription");
    setData(d);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function change(planCode: string) {
    setBusy(planCode);
    try {
      await apiRequest("/api/subscription", { method: "POST", body: JSON.stringify({ planCode }) });
      push("Plan updated.");
      load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to change plan.", "error");
    } finally {
      setBusy("");
    }
  }

  if (!data) return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;

  return (
    <div className="space-y-5">
      <PageHeader title="Subscription" subtitle={`You are on the ${data.plan.name} plan. Limits are enforced server-side.`} />

      <Card>
        <CardHeader title="Usage this month" subtitle={data.subscription?.renewsAt ? `Renews ${new Date(data.subscription.renewsAt).toLocaleDateString("en-MY")}` : "No renewal scheduled"} />
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meter label="Invoices" used={data.usage.invoicesThisMonth} limit={data.plan.limits.invoices} />
          <Meter label="Quotations" used={data.usage.quotationsThisMonth} limit={data.plan.limits.quotations} />
          <Meter label="Customers" used={data.usage.customers} limit={data.plan.limits.customers} />
          <Meter label="Team members" used={data.usage.team} limit={data.plan.limits.team} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.plans.map((p) => {
          const current = p.code === data.plan.code;
          return (
            <Card key={p.code} className={cx("p-6", current && "ring-2 ring-brand-500")}>
              {current && <span className="mb-2 inline-block rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">Current plan</span>}
              <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
              <p className="text-xs text-slate-500">{p.tagline}</p>
              <p className="mt-4 text-3xl font-black text-slate-900">RM{(p.priceCents / 100).toFixed(0)}<span className="text-sm font-medium text-slate-400">/month</span></p>
              <Button className="mt-4 w-full" variant={current ? "secondary" : "primary"} disabled={current} loading={busy === p.code} onClick={() => change(p.code)}>
                {current ? "Active" : p.priceCents > (data.plan.priceCents ?? 0) ? "Upgrade" : "Switch"}
              </Button>
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-0.5 text-emerald-500">✓</span>{f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <p className="text-sm text-slate-600">
          Need something bigger? The plan architecture is data-driven — new tiers can be added from the admin dashboard without a deployment.
        </p>
        {data.plan.code !== "free" && (
          <Button className="mt-3" variant="ghost" onClick={async () => {
            if (!confirm("Cancel your subscription? You will move to the Free plan limits at the end of the period.")) return;
            await apiRequest("/api/subscription", { method: "POST", body: JSON.stringify({ planCode: data.plan.code, action: "cancel" }) });
            push("Subscription cancelled.");
            load();
          }}>Cancel subscription</Button>
        )}
      </Card>
    </div>
  );
}
