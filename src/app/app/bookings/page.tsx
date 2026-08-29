"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Td, Th, TableWrap, Textarea, apiRequest, useToast } from "@/components/ui";
import { formatDate, today } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/status";

type Booking = {
  id: number; customerName: string; customerPhone: string | null; customerEmail: string | null;
  bookingDate: string; startTime: string; endTime: string; status: string; location: string | null;
  notes: string | null; serviceName: string | null; productId: number | null; staffMembershipId: number | null; source: string;
};
type Row = { booking: Booking; staffName: string | null; productName: string | null };

export default function BookingsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [services, setServices] = useState<{ id: number; name: string }[]>([]);
  const [team, setTeam] = useState<{ id: number; name: string }[]>([]);
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customerName: "", customerPhone: "", customerEmail: "", productId: "", staffMembershipId: "", bookingDate: today(), startTime: "10:00", endTime: "11:00", location: "", notes: "", status: "confirmed" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p, m, biz] = await Promise.all([
        apiRequest<{ items: Row[] }>(`/api/bookings?status=${status}`),
        apiRequest<{ items: { id: number; name: string }[] }>("/api/products?pageSize=100&active=1"),
        apiRequest<{ items: { membership: { id: number; name: string | null; status: string } }[] }>("/api/team").catch(() => ({ items: [] })),
        fetch("/api/businesses").then((r) => r.json()),
      ]);
      setRows(b.items);
      setServices(p.items);
      setTeam(m.items.filter((x) => x.membership.status === "active").map((x) => ({ id: x.membership.id, name: x.membership.name ?? "Member" })));
      setSlug(biz?.data?.business?.slug ?? "");
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to load bookings.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiRequest("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          productId: form.productId ? Number(form.productId) : null,
          staffMembershipId: form.staffMembershipId ? Number(form.staffMembershipId) : null,
          serviceName: services.find((s) => String(s.id) === form.productId)?.name ?? null,
        }),
      });
      push("Booking created.");
      setOpen(false);
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Unable to create the booking.", "error");
    }
  }

  async function setStatusFor(id: number, next: string) {
    await apiRequest(`/api/bookings/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    load();
  }

  const bookingUrl = typeof window !== "undefined" && slug ? `${window.location.origin}/book/${slug}` : "";

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Appointments, meetings, consultations and service bookings."
        action={<Button size="sm" onClick={() => setOpen(true)}>+ New booking</Button>}
      />

      {slug && (
        <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your public booking page</p>
            <p className="truncate text-sm font-semibold text-brand-700">{bookingUrl}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(bookingUrl); push("Link copied."); }}>Copy link</Button>
          <a href={`/book/${slug}`} target="_blank" rel="noreferrer"><Button size="sm">Preview</Button></a>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 p-3">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-[200px]">
            {["all", "pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : statusLabel(s)}</option>)}
          </Select>
          <span className="ml-auto text-xs text-slate-400">{rows.length} bookings</span>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="No bookings" description="Create a booking or share your public booking page with customers." />
        ) : (
          <TableWrap>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>Date</Th><Th>Time</Th><Th>Customer</Th><Th>Service</Th><Th>Staff</Th><Th>Source</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ booking, staffName, productName }) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <Td className="text-xs font-semibold">{formatDate(booking.bookingDate)}</Td>
                  <Td className="text-xs">{booking.startTime}–{booking.endTime}</Td>
                  <Td>
                    <span className="block text-sm font-medium text-slate-800">{booking.customerName}</span>
                    <span className="block text-xs text-slate-400">{booking.customerPhone}</span>
                  </Td>
                  <Td className="text-xs">{productName ?? booking.serviceName ?? "Appointment"}</Td>
                  <Td className="text-xs">{staffName ?? "—"}</Td>
                  <Td><Badge tone={booking.source === "public" ? "bg-brand-50 text-brand-700 ring-brand-600/20" : ""}>{booking.source}</Badge></Td>
                  <Td>
                    <Select value={booking.status} onChange={(e) => setStatusFor(booking.id, e.target.value)} className={`py-1 text-xs ${statusTone(booking.status)}`}>
                      {["pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                    </Select>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New booking" size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button form="bf" type="submit">Create booking</Button></>}>
        <form id="bf" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer name" required><Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} required /></Field>
          <Field label="Phone" required><Input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} required /></Field>
          <Field label="Email"><Input type="email" value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} /></Field>
          <Field label="Service">
            <Select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
              <option value="">General appointment</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <Field label="Staff member">
            <Select value={form.staffMembershipId} onChange={(e) => setForm((f) => ({ ...f, staffMembershipId: e.target.value }))}>
              <option value="">Any available</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {["pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </Select>
          </Field>
          <Field label="Date" required><Input type="date" value={form.bookingDate} onChange={(e) => setForm((f) => ({ ...f, bookingDate: e.target.value }))} required /></Field>
          <Field label="Start time" required><Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} required /></Field>
          <Field label="End time" required><Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} required /></Field>
          <Field label="Location"><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Shop, customer site, online…" /></Field>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field></div>
        </form>
      </Modal>
    </div>
  );
}
