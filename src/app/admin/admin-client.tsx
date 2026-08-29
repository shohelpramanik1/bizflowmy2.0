"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatCard } from "@/components/page-header";
import { BarChart } from "@/components/charts";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Tabs, Textarea, Td, Th, TableWrap, ToastProvider, apiRequest, useToast } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";

type Data = {
  users: { total: number; active: number; suspended: number; newThisMonth: number };
  businesses: { total: number; active: number; newThisMonth: number };
  subscriptions: { planCode: string; status: string; n: number }[];
  mrrCents: number; cancellations: number; popularPlan: string;
  invoices: { total: number; value: number };
  events: { event: string; n: number }[];
  tickets: { id: number; name: string; email: string; subject: string; message: string; status: string; createdAt: string }[];
  recentBusinesses: { business: { id: number; name: string; slug: string; status: string; createdAt: string }; plan: string | null; ownerName: string | null; ownerEmail: string | null }[];
  recentUsers: { id: number; name: string; email: string; status: string; createdAt: string; lastLoginAt: string | null }[];
  plans: { code: string; name: string; priceCents: number }[];
};

function Inner({ userName }: { userName: string }) {
  const { push } = useToast();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<Data | null>(null);
  const [ann, setAnn] = useState({ title: "", body: "" });

  const load = useCallback(async () => {
    try {
      setData(await apiRequest<Data>("/api/admin"));
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to load admin data.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>, msg: string) {
    try {
      await apiRequest("/api/admin", { method: "POST", body: JSON.stringify(body) });
      push(msg);
      load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Action failed.", "error");
    }
  }

  if (!data) return <div className="min-h-screen bg-slate-900 p-6"><div className="h-96 animate-pulse rounded-2xl bg-slate-800" /></div>;

  const paid = data.subscriptions.filter((s) => s.planCode !== "free" && s.status === "active").reduce((a, s) => a + s.n, 0);
  const free = data.subscriptions.filter((s) => s.planCode === "free").reduce((a, s) => a + s.n, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-slate-900">A</span>
          <div>
            <p className="text-sm font-bold">BizFlow MY · SaaS Administration</p>
            <p className="text-[11px] text-slate-400">Signed in as {userName}</p>
          </div>
          <Link href="/app" className="ml-auto rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">← Back to workspace</Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Total users" value={String(data.users.total)} hint={`${data.users.newThisMonth} new this month`} tone="brand" />
          <StatCard label="Active businesses" value={String(data.businesses.active)} hint={`${data.businesses.total} total workspaces`} tone="emerald" />
          <StatCard label="MRR" value={formatMoney(data.mrrCents)} hint={`${paid} paid subscribers`} tone="violet" />
          <StatCard label="Free users" value={String(free)} hint={`Most popular: ${data.popularPlan}`} tone="slate" />
          <StatCard label="Cancellations" value={String(data.cancellations)} hint={`${data.invoices.total} invoices platform-wide`} tone="rose" />
        </div>

        <Tabs active={tab} onChange={setTab} tabs={[
          { key: "overview", label: "Analytics" }, { key: "businesses", label: "Businesses" },
          { key: "users", label: "Users" }, { key: "support", label: "Support" }, { key: "announce", label: "Announcements" },
        ]} />

        {tab === "overview" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-white text-slate-900">
              <CardHeader title="Feature usage (last 30 days)" subtitle="Product analytics events" />
              <div className="p-4">
                {data.events.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No events recorded yet.</p> :
                  <BarChart data={data.events.map((e) => ({ label: e.event.replace(/_/g, " ").slice(0, 10), value: e.n }))} />}
              </div>
            </Card>
            <Card className="bg-white text-slate-900">
              <CardHeader title="Subscription distribution" />
              <TableWrap>
                <thead className="bg-slate-50"><tr><Th>Plan</Th><Th>Status</Th><Th className="text-right">Accounts</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.subscriptions.map((s, i) => (
                    <tr key={i}><Td className="font-semibold capitalize">{s.planCode}</Td><Td className="capitalize">{s.status}</Td><Td className="text-right font-bold">{s.n}</Td></tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          </div>
        )}

        {tab === "businesses" && (
          <Card className="bg-white text-slate-900">
            <CardHeader title="Businesses" subtitle="Manage workspaces, plans and suspensions" />
            <TableWrap>
              <thead className="bg-slate-50"><tr><Th>Business</Th><Th>Owner</Th><Th>Plan</Th><Th>Status</Th><Th>Created</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentBusinesses.map(({ business, plan, ownerName, ownerEmail }) => (
                  <tr key={business.id}>
                    <Td><span className="font-semibold">{business.name}</span><span className="block text-xs text-slate-400">/{business.slug}</span></Td>
                    <Td className="text-xs">{ownerName}<span className="block text-slate-400">{ownerEmail}</span></Td>
                    <Td>
                      <Select value={plan ?? "free"} onChange={(e) => act({ action: "set_plan", id: business.id, planCode: e.target.value }, "Plan updated.")} className="py-1 text-xs">
                        {data.plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                      </Select>
                    </Td>
                    <Td><Badge tone={business.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-rose-50 text-rose-700 ring-rose-600/20"}>{business.status}</Badge></Td>
                    <Td className="text-xs text-slate-400">{formatDateTime(business.createdAt)}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant={business.status === "active" ? "danger" : "success"}
                        onClick={() => act({ action: business.status === "active" ? "suspend_business" : "activate_business", id: business.id }, "Business updated.")}>
                        {business.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
        )}

        {tab === "users" && (
          <Card className="bg-white text-slate-900">
            <CardHeader title="Users" subtitle={`${data.users.active} active · ${data.users.suspended} suspended`} />
            <TableWrap>
              <thead className="bg-slate-50"><tr><Th>Name</Th><Th>Email</Th><Th>Status</Th><Th>Registered</Th><Th>Last login</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentUsers.map((u) => (
                  <tr key={u.id}>
                    <Td className="font-semibold">{u.name}</Td>
                    <Td className="text-xs">{u.email}</Td>
                    <Td><Badge tone={u.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-rose-50 text-rose-700 ring-rose-600/20"}>{u.status}</Badge></Td>
                    <Td className="text-xs text-slate-400">{formatDateTime(u.createdAt)}</Td>
                    <Td className="text-xs text-slate-400">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant={u.status === "active" ? "danger" : "success"}
                        onClick={() => act({ action: u.status === "active" ? "suspend_user" : "activate_user", id: u.id }, "User updated.")}>
                        {u.status === "active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>
        )}

        {tab === "support" && (
          <Card className="bg-white text-slate-900">
            <CardHeader title="Support requests" />
            {data.tickets.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">No tickets submitted.</p> : (
              <ul className="divide-y divide-slate-100">
                {data.tickets.map((t) => (
                  <li key={t.id} className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">{t.subject}</p>
                      <Badge tone={t.status === "open" ? "bg-amber-50 text-amber-700 ring-amber-600/20" : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"}>{t.status}</Badge>
                      <span className="ml-auto text-xs text-slate-400">{formatDateTime(t.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{t.name} · {t.email}</p>
                    <p className="mt-2 text-sm text-slate-700">{t.message}</p>
                    {t.status === "open" && <Button className="mt-2" size="sm" onClick={() => act({ action: "resolve_ticket", id: t.id }, "Ticket resolved.")}>Mark resolved</Button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {tab === "announce" && (
          <Card className="bg-white text-slate-900">
            <CardHeader title="Send an announcement" subtitle="Broadcast to all workspaces" />
            <div className="space-y-3 p-4">
              <Field label="Title" required><Input value={ann.title} onChange={(e) => setAnn((a) => ({ ...a, title: e.target.value }))} /></Field>
              <Field label="Message" required><Textarea value={ann.body} onChange={(e) => setAnn((a) => ({ ...a, body: e.target.value }))} /></Field>
              <Button onClick={() => { act({ action: "announce", title: ann.title, body: ann.body }, "Announcement published."); setAnn({ title: "", body: "" }); }}>
                Publish announcement
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

export default function AdminClient({ userName }: { userName: string }) {
  return <ToastProvider><Inner userName={userName} /></ToastProvider>;
}
