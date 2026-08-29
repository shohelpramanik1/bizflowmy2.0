"use client";

import { BarChart, DonutChart, GroupedBarChart, LineChart } from "@/components/charts";
import { Card, CardHeader, Tabs } from "@/components/ui";
import { formatCompact } from "@/lib/format";
import { statusLabel } from "@/lib/status";
import { useState } from "react";

type Monthly = { label: string; revenue: number; expense: number; profit: number }[];

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#f59e0b",
  viewed: "#6366f1",
  partially_paid: "#f97316",
  paid: "#10b981",
  overdue: "#ef4444",
  cancelled: "#64748b",
};

export function DashboardCharts({
  monthly,
  statuses,
  symbol,
  conversion,
}: {
  monthly: Monthly;
  statuses: { status: string; n: number; amount: number }[];
  symbol: string;
  conversion: { quotes: number; accepted: number; rate: number; value: number };
}) {
  const [tab, setTab] = useState("revenue");
  const fmt = (v: number) => formatCompact(v, symbol);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Business performance"
          subtitle="Monthly revenue, expenses and profit"
          action={
            <Tabs
              active={tab}
              onChange={setTab}
              tabs={[
                { key: "revenue", label: "Revenue" },
                { key: "expense", label: "Expenses" },
                { key: "profit", label: "Profit" },
                { key: "combined", label: "Combined" },
              ]}
            />
          }
        />
        <div className="p-4">
          {tab === "revenue" && <BarChart data={monthly.map((m) => ({ label: m.label, value: m.revenue }))} color="#345ef6" format={fmt} />}
          {tab === "expense" && <BarChart data={monthly.map((m) => ({ label: m.label, value: m.expense }))} color="#8b5cf6" format={fmt} />}
          {tab === "profit" && <LineChart data={monthly.map((m) => ({ label: m.label, value: m.profit }))} color="#059669" format={fmt} />}
          {tab === "combined" && (
            <GroupedBarChart
              data={monthly.map((m) => ({ label: m.label, values: [m.revenue, m.expense, Math.max(0, m.profit)] }))}
              series={[
                { name: "Revenue", color: "#345ef6" },
                { name: "Expenses", color: "#8b5cf6" },
                { name: "Profit", color: "#10b981" },
              ]}
              format={fmt}
            />
          )}
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Invoice status" />
          <div className="p-4">
            {statuses.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No invoices yet.</p>
            ) : (
              <DonutChart
                data={statuses.map((s) => ({ label: statusLabel(s.status), value: s.n, color: STATUS_COLORS[s.status] ?? "#94a3b8" }))}
              />
            )}
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Quotation conversion</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-3xl font-black text-slate-900">{conversion.rate}%</span>
            <span className="pb-1 text-xs text-slate-500">{conversion.accepted}/{conversion.quotes} accepted</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all" style={{ width: `${Math.min(100, conversion.rate)}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">Pipeline value {formatCompact(conversion.value, symbol)}</p>
        </Card>
      </div>
    </div>
  );
}
