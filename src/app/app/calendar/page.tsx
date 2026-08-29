"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, Tabs, apiRequest, cx } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { statusTone } from "@/lib/status";

type Booking = { id: number; customerName: string; bookingDate: string; startTime: string; endTime: string; status: string; serviceName: string | null };
type Row = { booking: Booking; staffName: string | null; productName: string | null };

function iso(d: Date) { return d.toISOString().slice(0, 10); }

export default function CalendarPage() {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth(), d = cursor.getDate();
    if (view === "day") return { from: iso(new Date(y, m, d)), to: iso(new Date(y, m, d)) };
    if (view === "week") {
      const dow = (cursor.getDay() + 6) % 7;
      return { from: iso(new Date(y, m, d - dow)), to: iso(new Date(y, m, d - dow + 6)) };
    }
    return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
  }, [cursor, view]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ items: Row[] }>(`/api/bookings?from=${range.from}&to=${range.to}`);
      setRows(data.items);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => { load(); }, [load]);

  function shift(dir: number) {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  }

  const grid = useMemo(() => {
    if (view !== "month") return [];
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const cells: (string | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= days; i++) cells.push(iso(new Date(y, m, i)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor, view]);

  const byDate = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const r of rows) (map[r.booking.bookingDate] ??= []).push(r);
    return map;
  }, [rows]);

  const weekDays = useMemo(() => {
    if (view !== "week") return [];
    const out: string[] = [];
    const start = new Date(`${range.from}T00:00:00`);
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); out.push(iso(d)); }
    return out;
  }, [range.from, view]);

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Every booking and appointment in day, week or month view."
        action={
          <>
            <Tabs active={view} onChange={setView} tabs={[{ key: "day", label: "Day" }, { key: "week", label: "Week" }, { key: "month", label: "Month" }]} />
            <Button size="sm" variant="secondary" onClick={() => shift(-1)}>←</Button>
            <Button size="sm" variant="secondary" onClick={() => setCursor(new Date())}>Today</Button>
            <Button size="sm" variant="secondary" onClick={() => shift(1)}>→</Button>
          </>
        }
      />

      <Card className="p-4">
        <p className="mb-3 text-sm font-bold text-slate-800">
          {view === "month"
            ? cursor.toLocaleDateString("en-MY", { month: "long", year: "numeric" })
            : `${formatDate(range.from)} → ${formatDate(range.to)}`}
        </p>

        {loading ? (
          <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
        ) : view === "month" ? (
          <div className="grid grid-cols-7 gap-1 text-xs">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{d}</div>
            ))}
            {grid.map((date, i) => (
              <div key={i} className={cx("min-h-[86px] rounded-lg border p-1.5", date ? "border-slate-200 bg-white" : "border-transparent bg-slate-50/50")}>
                {date && (
                  <>
                    <span className={cx("text-[11px] font-bold", date === iso(new Date()) ? "rounded bg-brand-600 px-1.5 text-white" : "text-slate-500")}>
                      {Number(date.slice(-2))}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {(byDate[date] ?? []).slice(0, 3).map(({ booking }) => (
                        <div key={booking.id} className="truncate rounded bg-brand-50 px-1 py-0.5 text-[10px] font-medium text-brand-800">
                          {booking.startTime} {booking.customerName}
                        </div>
                      ))}
                      {(byDate[date] ?? []).length > 3 && <p className="text-[10px] text-slate-400">+{(byDate[date] ?? []).length - 3} more</p>}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : view === "week" ? (
          <div className="grid gap-2 sm:grid-cols-7">
            {weekDays.map((d) => (
              <div key={d} className="rounded-lg border border-slate-200 p-2">
                <p className="text-[10px] font-bold uppercase text-slate-400">{new Date(`${d}T00:00:00`).toLocaleDateString("en-MY", { weekday: "short", day: "2-digit" })}</p>
                <div className="mt-1.5 space-y-1">
                  {(byDate[d] ?? []).map(({ booking }) => (
                    <div key={booking.id} className="rounded bg-brand-50 p-1.5">
                      <p className="text-[11px] font-bold text-brand-800">{booking.startTime}</p>
                      <p className="truncate text-[11px] text-slate-700">{booking.customerName}</p>
                    </div>
                  ))}
                  {(byDate[d] ?? []).length === 0 && <p className="py-3 text-center text-[10px] text-slate-300">Free</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(byDate[range.from] ?? []).length === 0 && <p className="py-10 text-center text-sm text-slate-400">No bookings on this day.</p>}
            {(byDate[range.from] ?? []).map(({ booking, staffName, productName }) => (
              <li key={booking.id} className="flex items-center gap-3 py-3">
                <div className="w-20 shrink-0 text-sm font-bold text-brand-700">{booking.startTime}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">{booking.customerName}</p>
                  <p className="text-xs text-slate-500">{productName ?? booking.serviceName ?? "Appointment"} · {staffName ?? "Unassigned"} · until {booking.endTime}</p>
                </div>
                <Badge tone={statusTone(booking.status)}>{booking.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
