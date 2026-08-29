"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Button, Field, Input, Modal, Select, Textarea, apiRequest, useToast } from "@/components/ui";
import { formatMoney, fromCents, toCents, today } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/format";
import { whatsappUrl } from "@/lib/messaging";

type ShareResult = { subject: string; body: string; link: string; customerEmail: string | null; customerPhone: string | null };

export default function DocumentActions({
  kind,
  docId,
  number,
  status,
  totalCents,
  paidCents,
  symbol,
  customerPhone,
  customerName,
  converted,
  canWrite,
}: {
  kind: "quotation" | "invoice";
  docId: number;
  number: string;
  status: string;
  totalCents: number;
  paidCents?: number;
  symbol: string;
  customerPhone: string | null;
  customerName: string;
  converted?: number | null;
  canWrite: boolean;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [share, setShare] = useState<ShareResult | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const balance = totalCents - (paidCents ?? 0);
  const [payAmount, setPayAmount] = useState(fromCents(balance));
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payDate, setPayDate] = useState(today());
  const [payRef, setPayRef] = useState("");

  const base = kind === "quotation" ? "/api/quotations" : "/api/invoices";

  async function setStatus(next: string) {
    setBusy(next);
    try {
      await apiRequest(`${base}/${docId}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      push(`Marked as ${next.replace("_", " ")}.`);
      router.refresh();
    } catch (e) {
      push(e instanceof Error ? e.message : "Action failed.", "error");
    } finally {
      setBusy("");
    }
  }

  async function convert() {
    setBusy("convert");
    try {
      const data = await apiRequest<{ invoice: { id: number; number: string } }>(`${base}/${docId}/convert`, { method: "POST" });
      push(`Invoice ${data.invoice.number} created.`);
      router.push(`/app/invoices/${data.invoice.id}`);
      router.refresh();
    } catch (e) {
      push(e instanceof Error ? e.message : "Conversion failed.", "error");
    } finally {
      setBusy("");
    }
  }

  async function prepareShare(channel: "email" | "whatsapp") {
    setBusy(channel);
    try {
      const data = await apiRequest<ShareResult>("/api/share", {
        method: "POST",
        body: JSON.stringify({ docType: kind, docId, channel, markSent: true }),
      });
      setShare(data);
      if (channel === "whatsapp") {
        const message =
          kind === "invoice"
            ? `Hello ${customerName},\n\nPlease find your invoice ${number}.\nAmount: ${formatMoney(totalCents, symbol)}\n\nSecure link: ${data.link}\n\nThank you.`
            : `Hello ${customerName},\n\nHere is your quotation ${number}.\nTotal: ${formatMoney(totalCents, symbol)}\n\nView & accept: ${data.link}\n\nThank you.`;
        window.open(whatsappUrl(customerPhone, message), "_blank");
        push("WhatsApp message prepared.");
      } else {
        setShareOpen(true);
      }
      router.refresh();
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to prepare the message.", "error");
    } finally {
      setBusy("");
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy("pay");
    try {
      await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: docId,
          amountCents: toCents(payAmount),
          paidAt: payDate,
          method: payMethod,
          reference: payRef || null,
        }),
      });
      push("Payment recorded.");
      setPayOpen(false);
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Unable to record payment.", "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => window.print()}>🖨️ Download PDF</Button>
        <Button variant="secondary" size="sm" loading={busy === "email"} onClick={() => prepareShare("email")}>✉️ Send email</Button>
        <Button variant="success" size="sm" loading={busy === "whatsapp"} onClick={() => prepareShare("whatsapp")}>💬 Send via WhatsApp</Button>

        {canWrite && kind === "quotation" && (
          <>
            {status !== "accepted" && status !== "converted" && (
              <Button size="sm" variant="secondary" loading={busy === "accepted"} onClick={() => setStatus("accepted")}>✅ Mark accepted</Button>
            )}
            {status !== "rejected" && status !== "converted" && (
              <Button size="sm" variant="secondary" loading={busy === "rejected"} onClick={() => setStatus("rejected")}>Mark rejected</Button>
            )}
            {converted ? (
              <Link href={`/app/invoices/${converted}`}>
                <Button size="sm" variant="secondary">View invoice →</Button>
              </Link>
            ) : (
              <Button size="sm" loading={busy === "convert"} onClick={convert}>⚡ Convert to invoice</Button>
            )}
            <Link href={`/app/quotations/${docId}/edit`}><Button size="sm" variant="ghost">Edit</Button></Link>
          </>
        )}

        {canWrite && kind === "invoice" && (
          <>
            {balance > 0 && status !== "cancelled" && <Button size="sm" onClick={() => setPayOpen(true)}>💰 Record payment</Button>}
            {status === "draft" && <Button size="sm" variant="secondary" loading={busy === "sent"} onClick={() => setStatus("sent")}>Mark as sent</Button>}
            {status !== "cancelled" && status !== "paid" && (
              <Button size="sm" variant="ghost" loading={busy === "cancelled"} onClick={() => setStatus("cancelled")}>Cancel invoice</Button>
            )}
            {(paidCents ?? 0) === 0 && <Link href={`/app/invoices/${docId}/edit`}><Button size="sm" variant="ghost">Edit</Button></Link>}
          </>
        )}
      </div>

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Email preview"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShareOpen(false)}>Close</Button>
            {share?.customerEmail && (
              <a href={`mailto:${share.customerEmail}?subject=${encodeURIComponent(share.subject)}&body=${encodeURIComponent(share.body)}`}>
                <Button>Open in mail app</Button>
              </a>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Message queued in the outbox and logged for audit. Connect a transactional email provider in Settings to deliver automatically.
          </div>
          <Field label="To"><Input readOnly value={share?.customerEmail ?? "No email on file for this customer"} /></Field>
          <Field label="Subject"><Input readOnly value={share?.subject ?? ""} /></Field>
          <Field label="Message"><Textarea readOnly rows={10} value={share?.body ?? ""} /></Field>
          <Field label="Secure document link"><Input readOnly value={share?.link ?? ""} /></Field>
        </div>
      </Modal>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={`Record payment for ${number}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button form="pay-form" type="submit" loading={busy === "pay"}>Save payment</Button>
          </>
        }
      >
        <form id="pay-form" onSubmit={recordPayment} className="space-y-3">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Outstanding balance: </span>
            <strong className="text-slate-900">{formatMoney(balance, symbol)}</strong>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`Amount (${symbol})`} required>
              <Input type="number" step="0.01" min="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
            </Field>
            <Field label="Payment date" required>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
            </Field>
            <Field label="Payment method">
              <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <Field label="Reference number">
              <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. FPX 8823001" />
            </Field>
          </div>
          <p className="text-xs text-slate-400">Partial payments are supported — the invoice status updates automatically.</p>
        </form>
      </Modal>
    </>
  );
}
