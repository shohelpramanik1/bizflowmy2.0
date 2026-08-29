"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader, StatCard } from "@/components/page-header";
import { BarChart, DonutChart, GroupedBarChart } from "@/components/charts";
import { Button, Card, CardHeader, Select, Tabs, Td, Th, TableWrap, apiRequest } from "@/components/ui";
import { formatCompact, formatMoney } from "@/lib/format";
import { statusLabel } from "@/lib/status";

type Data = {
  range: { from: string; to: string };
  summary: { revenue: number; collected: number; outstanding: number; overdueAmount: number; expenses: number; netProfit: number; invoiceCount: number; paidCount: number; unpaidCount: number; overdueCount: number; quotationCount: number; quotationAccepted: number; conversionRate: number };
  monthly: { label: string; revenue: number; expense: number; profit: number }[];
  statuses: { status: string; n: number; amount: number }[];
  categories: { category: string; total: number; n: number }[];
  topCustomers: { id: number; name: string; company: string | null; revenue: number; paid: number; invoices: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
};

const COLORS = ["#345ef6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#64748b"];

export default function ReportsPage() {
  const [preset, setPreset] = useState("year");
  const [tab, setTab] = useState("sales");
  const [data, setData] = useState<Data | null>(null);
  const [symbol, setSymbol] = useState("RM");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, b] = await Promise.all([apiRequest<Data>(`/api/reports?preset=${preset}`), fetch("/api/businesses").then((r) => r.json())]);
      setData(d);
      setSymbol(b?.data?.business?.currencySymbol ?? "RM");
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => { load(); }, [load]);

  const fmt = (v: number) => formatCompact(v, symbol);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Sales, invoices, expenses, profit & loss, customers and products."
        action={
          <>
            <Select value={preset} onChange={(e) => setPreset(e.target.value)} className="max-w-[160px]">
              <option value="today">Today</option><option value="week">This week</option>
              <option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option>
            </Select>
            <a href={`/api/reports/export?type=invoices&preset=${preset}`}><Button size="sm" variant="secondary">⬇ Invoices CSV</Button></a>
            <Button size="sm" variant="secondary" onClick={() => window.print()}>🖨️ PDF</Button>
          </>
        }
      />

      {loading || !data ? (
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Revenue" value={formatMoney(data.summary.revenue, symbol)} hint={`${data.summary.invoiceCount} invoices`} tone="brand" />
            <StatCard label="Collected" value={formatMoney(data.summary.collected, symbol)} hint={`${data.summary.paidCount} paid`} tone="emerald" />
            <StatCard label="Outstanding" value={formatMoney(data.summary.outstanding, symbol)} hint={`${data.summary.unpaidCount} unpaid`} tone="amber" />
            <StatCard label="Overdue" value={formatMoney(data.summary.overdueAmount, symbol)} hint={`${data.summary.overdueCount} overdue`} tone="rose" />
            <StatCard label="Net profit" value={formatMoney(data.summary.netProfit, symbol)} hint={`Expenses ${formatCompact(data.summary.expenses, symbol)}`} tone="violet" />
          </div>

          <Tabs
            active={tab}
            onChange={setTab}
            tabs={[
              { key: "sales", label: "Sales" }, { key: "invoices", label: "Invoices" },
              { key: "expenses", label: "Expenses" }, { key: "pl", label: "Profit & Loss" },
              { key: "customers", label: "Customers" }, { key: "products", label: "Products" },
            ]}
          />

          {tab === "sales" && (
            <Card><CardHeader title="Monthly sales" subtitle="Invoiced value per month" />
              <div className="p-4"><BarChart data={data.monthly.map((m) => ({ label: m.label, value: m.revenue }))} format={fmt} /></div>
            </Card>
          )}

          {tab === "invoices" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader title="Invoice status breakdown" />
                <div className="p-4">
                  {data.statuses.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No invoices.</p> :
                    <DonutChart data={data.statuses.map((s, i) => ({ label: statusLabel(s.status), value: s.n, color: COLORS[i % COLORS.length] }))} />}
                </div>
              </Card>
              <Card><CardHeader title="Value by status" />
                <TableWrap>
                  <thead className="bg-slate-50/60"><tr><Th>Status</Th><Th className="text-right">Count</Th><Th className="text-right">Value</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.statuses.map((s) => (
                      <tr key={s.status}><Td className="font-medium">{statusLabel(s.status)}</Td><Td className="text-right">{s.n}</Td><Td className="text-right font-bold">{formatMoney(s.amount, symbol)}</Td></tr>
                    ))}
                  </tbody>
                </TableWrap>
              </Card>
            </div>
          )}

          {tab === "expenses" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card><CardHeader title="Expenses by category" />
                <div className="p-4">
                  {data.categories.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No expenses recorded.</p> :
                    <DonutChart data={data.categories.map((c, i) => ({ label: c.category, value: c.n, color: COLORS[i % COLORS.length] }))} />}
                </div>
              </Card>
              <Card><CardHeader title="Monthly expenses" action={<a href={`/api/reports/export?type=expenses&preset=${preset}`} className="text-xs font-semibold text-brand-700 hover:underline">Export CSV</a>} />
                <div className="p-4"><BarChart data={data.monthly.map((m) => ({ label: m.label, value: m.expense }))} color="#8b5cf6" format={fmt} /></div>
              </Card>
            </div>
          )}

          {tab === "pl" && (
            <Card><CardHeader title="Profit & Loss" subtitle="Revenue − Expenses = Profit" />
              <div className="p-4">
                <GroupedBarChart
                  data={data.monthly.map((m) => ({ label: m.label, values: [m.revenue, m.expense, Math.max(0, m.profit)] }))}
                  series={[{ name: "Revenue", color: "#345ef6" }, { name: "Expenses", color: "#8b5cf6" }, { name: "Profit", color: "#10b981" }]}
                  format={fmt}
                />
                <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-brand-50 p-4"><dt className="text-xs font-bold uppercase text-brand-600">Revenue</dt><dd className="text-xl font-black text-brand-800">{formatMoney(data.summary.revenue, symbol)}</dd></div>
                  <div className="rounded-xl bg-violet-50 p-4"><dt className="text-xs font-bold uppercase text-violet-600">Expenses</dt><dd className="text-xl font-black text-violet-800">− {formatMoney(data.summary.expenses, symbol)}</dd></div>
                  <div className="rounded-xl bg-emerald-50 p-4"><dt className="text-xs font-bold uppercase text-emerald-600">Net profit</dt><dd className="text-xl font-black text-emerald-800">{formatMoney(data.summary.netProfit, symbol)}</dd></div>
                </dl>
              </div>
            </Card>
          )}

          {tab === "customers" && (
            <Card><CardHeader title="Top customers" action={<a href="/api/reports/export?type=customers" className="text-xs font-semibold text-brand-700 hover:underline">Export CSV</a>} />
              <TableWrap>
                <thead className="bg-slate-50/60"><tr><Th>Customer</Th><Th className="text-right">Invoices</Th><Th className="text-right">Revenue</Th><Th className="text-right">Paid</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topCustomers.map((c) => (
                    <tr key={c.id}>
                      <Td><span className="font-semibold text-slate-800">{c.name}</span>{c.company && <span className="block text-xs text-slate-400">{c.company}</span>}</Td>
                      <Td className="text-right">{c.invoices}</Td>
                      <Td className="text-right font-bold">{formatMoney(c.revenue, symbol)}</Td>
                      <Td className="text-right text-emerald-600">{formatMoney(c.paid, symbol)}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          )}

          {tab === "products" && (
            <Card><CardHeader title="Most sold products & services" />
              <TableWrap>
                <thead className="bg-slate-50/60"><tr><Th>Item</Th><Th className="text-right">Qty sold</Th><Th className="text-right">Revenue</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topProducts.length === 0 && <tr><Td className="text-center text-slate-400">No sales in this period.</Td><Td /><Td /></tr>}
                  {data.topProducts.map((p) => (
                    <tr key={p.name}><Td className="font-medium text-slate-800">{p.name}</Td><Td className="text-right">{p.qty}</Td><Td className="text-right font-bold">{formatMoney(p.revenue, symbol)}</Td></tr>
                  ))}
                </tbody>
              </TableWrap>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
