"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Td, Th, TableWrap, apiRequest, useToast } from "@/components/ui";
import { PAYMENT_METHODS, formatDate, formatMoney, fromCents, toCents, today } from "@/lib/format";

type Row = { payment: { id: number; amountCents: number; paidAt: string; method: string; reference: string | null; invoiceId: number }; invoiceNumber: string; customerName: string };
type Invoice = { id: number; number: string; totalCents: number; paidCents: number; customerName: string };

export default function PaymentsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [symbol, setSymbol] = useState("RM");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ invoiceId: "", amount: "", paidAt: today(), method: "bank_transfer", reference: "", notes: "" });

  async function load() {
    setLoading(true);
    try {
      const [p, i, b] = await Promise.all([
        apiRequest<{ items: Row[] }>("/api/payments?pageSize=100"),
        apiRequest<{ items: { invoice: { id: number; number: string; totalCents: number; paidCents: number; status: string }; customerName: string }[] }>("/api/invoices?pageSize=100"),
        fetch("/api/businesses").then((r) => r.json()),
      ]);
      setRows(p.items);
      setInvoices(i.items.filter((x) => x.invoice.status !== "cancelled" && x.invoice.paidCents < x.invoice.totalCents).map((x) => ({ ...x.invoice, customerName: x.customerName })));
      setSymbol(b?.data?.business?.currencySymbol ?? "RM");
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to load payments.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const selected = invoices.find((i) => String(i.id) === form.invoiceId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: Number(form.invoiceId), amountCents: toCents(form.amount), paidAt: form.paidAt,
          method: form.method, reference: form.reference || null, notes: form.notes || null,
        }),
      });
      push("Payment recorded.");
      setOpen(false);
      setForm({ invoiceId: "", amount: "", paidAt: today(), method: "bank_transfer", reference: "", notes: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record the payment.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this payment? The invoice balance will be recalculated.")) return;
    try {
      await apiRequest(`/api/payments/${id}`, { method: "DELETE" });
      push("Payment deleted.");
      load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to delete.", "error");
    }
  }

  const total = rows.reduce((s, r) => s + r.payment.amountCents, 0);

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Record full or partial payments — invoice statuses update automatically."
        action={
          <>
            <a href="/api/reports/export?type=payments"><Button variant="secondary" size="sm">⬇ Export CSV</Button></a>
            <Button size="sm" onClick={() => setOpen(true)}>+ Record payment</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total collected</p><p className="mt-1 text-xl font-black text-emerald-600">{formatMoney(total, symbol)}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Payments recorded</p><p className="mt-1 text-xl font-black text-slate-900">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Invoices awaiting payment</p><p className="mt-1 text-xl font-black text-amber-600">{invoices.length}</p></Card>
      </div>

      <Card>
        {loading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="No payments yet" description="Record a payment against any unpaid invoice." action={<Button size="sm" onClick={() => setOpen(true)}>Record payment</Button>} />
        ) : (
          <TableWrap>
            <thead className="border-b border-slate-100 bg-slate-50/60">
              <tr><Th>Date</Th><Th>Invoice</Th><Th>Customer</Th><Th>Method</Th><Th>Reference</Th><Th className="text-right">Amount</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ payment, invoiceNumber, customerName }) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <Td className="text-xs">{formatDate(payment.paidAt)}</Td>
                  <Td><Link href={`/app/invoices/${payment.invoiceId}`} className="font-semibold text-brand-700 hover:underline">{invoiceNumber}</Link></Td>
                  <Td className="text-sm">{customerName}</Td>
                  <Td><Badge>{payment.method.replace("_", " ")}</Badge></Td>
                  <Td className="text-xs text-slate-500">{payment.reference ?? "—"}</Td>
                  <Td className="text-right font-bold text-emerald-600">{formatMoney(payment.amountCents, symbol)}</Td>
                  <Td className="text-right"><button onClick={() => remove(payment.id)} className="text-xs font-semibold text-rose-600 hover:underline">Delete</button></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record a payment"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button form="pf" type="submit" loading={saving}>Save payment</Button></>}
      >
        <form id="pf" onSubmit={submit} className="space-y-3">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <Field label="Invoice" required>
            <Select value={form.invoiceId} onChange={(e) => {
              const inv = invoices.find((i) => String(i.id) === e.target.value);
              setForm((f) => ({ ...f, invoiceId: e.target.value, amount: inv ? fromCents(inv.totalCents - inv.paidCents) : "" }));
            }} required>
              <option value="">Select an unpaid invoice…</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>{i.number} — {i.customerName} ({formatMoney(i.totalCents - i.paidCents, symbol)} due)</option>
              ))}
            </Select>
          </Field>
          {selected && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Invoice total {formatMoney(selected.totalCents, symbol)} · already paid {formatMoney(selected.paidCents, symbol)} · outstanding <strong>{formatMoney(selected.totalCents - selected.paidCents, symbol)}</strong>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Amount (${symbol})`} required><Input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required /></Field>
            <Field label="Payment date" required><Input type="date" value={form.paidAt} onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))} required /></Field>
            <Field label="Method"><Select value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
            <Field label="Reference"><Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="FPX / DuitNow ref" /></Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
