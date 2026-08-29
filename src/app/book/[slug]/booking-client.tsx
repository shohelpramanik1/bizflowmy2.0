"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, ToastProvider, apiRequest, cx } from "@/components/ui";
import { formatDate, formatMoney, today } from "@/lib/format";

type Service = { id: number; name: string; priceCents: number; durationMinutes: number | null; description: string | null };
type Staff = { id: number; name: string; position: string | null };

const SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

function Inner({ slug, business, services, staff }: { slug: string; business: { name: string; logoUrl: string | null; address: string | null; phone: string | null; currencySymbol: string }; services: Service[]; staff: Staff[] }) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number | null>(services[0]?.id ?? null);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [date, setDate] = useState(today());
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [done, setDone] = useState<{ date: string; start: string; end: string; service: string | null } | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      const data = await apiRequest<{ booking: { date: string; start: string; end: string; service: string | null } }>(`/api/public/${slug}`, {
        method: "POST",
        body: JSON.stringify({ productId: serviceId, staffMembershipId: staffId, bookingDate: date, startTime: slot, ...form }),
      });
      setDone(data.booking);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete the booking.");
    } finally {
      setSaving(false);
    }
  }

  const service = services.find((s) => s.id === serviceId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={business.logoUrl} alt={business.name} className="h-12 w-12 rounded-xl object-contain" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">{business.name.slice(0, 2).toUpperCase()}</span>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900">{business.name}</h1>
            <p className="text-xs text-slate-500">{[business.address, business.phone].filter(Boolean).join(" · ")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
          {done ? (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
              <h2 className="mt-4 text-xl font-black text-slate-900">Booking confirmed!</h2>
              <p className="mt-2 text-sm text-slate-600">
                {done.service ?? "Appointment"} on <strong>{formatDate(done.date)}</strong> at <strong>{done.start}</strong> – {done.end}.
              </p>
              <p className="mt-3 text-xs text-slate-400">{business.name} has been notified and will confirm shortly.</p>
              <Button className="mt-5" variant="secondary" onClick={() => { setDone(null); setStep(1); setForm({ name: "", phone: "", email: "", notes: "" }); }}>Make another booking</Button>
            </div>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-1.5">
                {[1, 2, 3, 4].map((i) => <div key={i} className={cx("h-1.5 flex-1 rounded-full", i <= step ? "bg-brand-600" : "bg-slate-200")} />)}
              </div>
              {error && <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

              {step === 1 && (
                <>
                  <h2 className="text-lg font-bold text-slate-900">1. Select a service</h2>
                  <div className="mt-3 space-y-2">
                    {services.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No bookable services published yet — choose “General appointment”.</p>}
                    <button onClick={() => setServiceId(null)} className={cx("w-full rounded-xl border p-3 text-left transition", serviceId === null ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50")}>
                      <span className="text-sm font-bold text-slate-800">General appointment</span>
                      <span className="block text-xs text-slate-500">60 minutes</span>
                    </button>
                    {services.map((s) => (
                      <button key={s.id} onClick={() => setServiceId(s.id)} className={cx("w-full rounded-xl border p-3 text-left transition", serviceId === s.id ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:bg-slate-50")}>
                        <span className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800">{s.name}</span>
                          <span className="text-sm font-bold text-brand-700">{formatMoney(s.priceCents, business.currencySymbol)}</span>
                        </span>
                        <span className="block text-xs text-slate-500">{s.durationMinutes ?? 60} minutes{s.description ? ` · ${s.description}` : ""}</span>
                      </button>
                    ))}
                  </div>
                  <Button className="mt-5 w-full" onClick={() => setStep(2)}>Continue →</Button>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-lg font-bold text-slate-900">2. Choose a staff member</h2>
                  <div className="mt-3 space-y-2">
                    <button onClick={() => setStaffId(null)} className={cx("w-full rounded-xl border p-3 text-left", staffId === null ? "border-brand-500 bg-brand-50" : "border-slate-200")}>
                      <span className="text-sm font-bold text-slate-800">Any available</span>
                    </button>
                    {staff.map((s) => (
                      <button key={s.id} onClick={() => setStaffId(s.id)} className={cx("w-full rounded-xl border p-3 text-left", staffId === s.id ? "border-brand-500 bg-brand-50" : "border-slate-200")}>
                        <span className="text-sm font-bold text-slate-800">{s.name}</span>
                        {s.position && <span className="block text-xs text-slate-500">{s.position}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                    <Button className="flex-1" onClick={() => setStep(3)}>Continue →</Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-lg font-bold text-slate-900">3. Pick a date &amp; time</h2>
                  <div className="mt-3">
                    <Field label="Date"><Input type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
                    <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Available times</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {SLOTS.map((t) => (
                        <button key={t} onClick={() => setSlot(t)} className={cx("rounded-lg border py-2 text-sm font-semibold transition", slot === t ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                    <Button className="flex-1" disabled={!slot} onClick={() => setStep(4)}>Continue →</Button>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <h2 className="text-lg font-bold text-slate-900">4. Your details</h2>
                  <div className="mt-3 space-y-3">
                    <Field label="Full name" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></Field>
                    <Field label="Phone number" required><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="012-345 6789" required /></Field>
                    <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
                    <Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Anything we should know?" /></Field>
                  </div>
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="font-bold text-slate-800">{service?.name ?? "General appointment"}</p>
                    <p className="text-slate-600">{formatDate(date)} at {slot}</p>
                    {service && <p className="text-brand-700">{formatMoney(service.priceCents, business.currencySymbol)}</p>}
                  </div>
                  <div className="mt-5 flex gap-2">
                    <Button variant="secondary" onClick={() => setStep(3)}>← Back</Button>
                    <Button className="flex-1" loading={saving} disabled={!form.name || !form.phone} onClick={confirm}>Confirm booking ✓</Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by BizFlow MY</p>
      </div>
    </div>
  );
}

export default function BookingClient(props: Parameters<typeof Inner>[0]) {
  return <ToastProvider><Inner {...props} /></ToastProvider>;
}
