"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardHeader, Field, Input, Select, Textarea, apiRequest, useToast } from "@/components/ui";
import { addDays, bpToPct, formatMoney, fromCents, pctToBp, toCents, today } from "@/lib/format";

type Customer = { id: number; name: string; companyName: string | null };
type Product = { id: number; name: string; description: string | null; priceCents: number; taxRateBp: number; discountBp: number };

export type DocLine = {
  key: string;
  productId: number | null;
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  taxPct: string;
};

function blankLine(): DocLine {
  return { key: Math.random().toString(36).slice(2), productId: null, name: "", description: "", quantity: "1", unitPrice: "0.00", discountPct: "0", taxPct: "0" };
}

export default function DocumentForm({
  kind,
  symbol,
  defaultTaxBp,
  defaultTerms,
  defaultNotes,
  paymentTermDays,
  existing,
  docId,
}: {
  kind: "quotation" | "invoice";
  symbol: string;
  defaultTaxBp: number;
  defaultTerms: string;
  defaultNotes: string;
  paymentTermDays: number;
  existing?: {
    customerId: number;
    issueDate: string;
    secondDate: string;
    notes: string;
    terms: string;
    items: { productId: number | null; name: string; description: string | null; quantity: number; unitPriceCents: number; discountBp: number; taxRateBp: number }[];
  };
  docId?: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState(existing?.customerId ? String(existing.customerId) : "");
  const [issueDate, setIssueDate] = useState(existing?.issueDate ?? today());
  const [secondDate, setSecondDate] = useState(existing?.secondDate ?? addDays(today(), kind === "quotation" ? 14 : paymentTermDays));
  const [notes, setNotes] = useState(existing?.notes ?? defaultNotes);
  const [terms, setTerms] = useState(existing?.terms ?? defaultTerms);
  const [lines, setLines] = useState<DocLine[]>(
    existing?.items.length
      ? existing.items.map((i) => ({
          key: Math.random().toString(36).slice(2),
          productId: i.productId,
          name: i.name,
          description: i.description ?? "",
          quantity: String(i.quantity),
          unitPrice: fromCents(i.unitPriceCents),
          discountPct: bpToPct(i.discountBp),
          taxPct: bpToPct(i.taxRateBp),
        }))
      : [blankLine()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [c, p] = await Promise.all([
          apiRequest<{ items: { customer: Customer }[] }>("/api/customers?pageSize=100"),
          apiRequest<{ items: Product[] }>("/api/products?pageSize=100&active=1"),
        ]);
        setCustomers(c.items.map((i) => i.customer));
        setProducts(p.items);
      } catch {
        /* handled by empty selects */
      }
    })();
  }, []);

  const totals = useMemo(() => {
    let subtotal = 0, discount = 0, tax = 0;
    for (const l of lines) {
      const qty = Number(l.quantity) || 0;
      const unit = toCents(l.unitPrice);
      const gross = Math.round(qty * unit);
      const d = Math.round((gross * pctToBp(l.discountPct)) / 10000);
      const net = gross - d;
      const t = Math.round((net * pctToBp(l.taxPct)) / 10000);
      subtotal += gross; discount += d; tax += t;
    }
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [lines]);

  function update(key: string, patch: Partial<DocLine>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickProduct(key: string, productIdRaw: string) {
    const p = products.find((x) => String(x.id) === productIdRaw);
    if (!p) {
      update(key, { productId: null });
      return;
    }
    update(key, {
      productId: p.id,
      name: p.name,
      description: p.description ?? "",
      unitPrice: fromCents(p.priceCents),
      discountPct: bpToPct(p.discountBp),
      taxPct: bpToPct(p.taxRateBp || defaultTaxBp),
    });
  }

  async function save(status: "draft" | "sent") {
    setSaving(true);
    setError("");
    try {
      if (!customerId) throw new Error("Please select a customer.");
      const items = lines
        .filter((l) => l.name.trim())
        .map((l) => ({
          productId: l.productId,
          name: l.name.trim(),
          description: l.description || null,
          quantity: Number(l.quantity) || 0,
          unitPriceCents: toCents(l.unitPrice),
          discountBp: pctToBp(l.discountPct),
          taxRateBp: pctToBp(l.taxPct),
        }));
      if (items.length === 0) throw new Error("Add at least one line item.");

      const payload =
        kind === "quotation"
          ? { customerId: Number(customerId), issueDate, expiryDate: secondDate, notes, terms, items, status }
          : { customerId: Number(customerId), issueDate, dueDate: secondDate, notes, paymentTerms: terms, items, status };

      const base = kind === "quotation" ? "/api/quotations" : "/api/invoices";
      if (docId) {
        await apiRequest(`${base}/${docId}`, { method: "PATCH", body: JSON.stringify(payload) });
        push(`${kind === "quotation" ? "Quotation" : "Invoice"} updated.`);
        router.push(`${kind === "quotation" ? "/app/quotations" : "/app/invoices"}/${docId}`);
      } else {
        const data = await apiRequest<Record<string, { id: number }>>(base, { method: "POST", body: JSON.stringify(payload) });
        const created = kind === "quotation" ? data.quotation : data.invoice;
        push(`${kind === "quotation" ? "Quotation" : "Invoice"} created.`);
        router.push(`${kind === "quotation" ? "/app/quotations" : "/app/invoices"}/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</div>}

      <Card>
        <CardHeader title="Document details" />
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <Field label="Customer" required>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.companyName ? ` — ${c.companyName}` : ""}</option>
              ))}
            </Select>
          </Field>
          <Field label="Issue date" required>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </Field>
          <Field label={kind === "quotation" ? "Expiry date" : "Due date"}>
            <Input type="date" value={secondDate} onChange={(e) => setSecondDate(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Line items"
          action={<Button size="sm" variant="secondary" onClick={() => setLines((l) => [...l, blankLine()])}>+ Add line</Button>}
        />
        <div className="space-y-3 p-4">
          {lines.map((l, idx) => (
            <div key={l.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                {lines.length > 1 && (
                  <button onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-xs font-semibold text-rose-600 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <Field label="Item">
                    <Select value={l.productId ? String(l.productId) : ""} onChange={(e) => pickProduct(l.key, e.target.value)}>
                      <option value="">Custom item…</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                </div>
                <div className="sm:col-span-8">
                  <Field label="Description">
                    <Input value={l.name} onChange={(e) => update(l.key, { name: e.target.value })} placeholder="e.g. Website Development" />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Qty">
                    <Input type="number" min="0" step="1" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label={`Unit price (${symbol})`}>
                    <Input type="number" min="0" step="0.01" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Disc %">
                    <Input type="number" min="0" max="100" step="0.01" value={l.discountPct} onChange={(e) => update(l.key, { discountPct: e.target.value })} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Tax %">
                    <Input type="number" min="0" max="100" step="0.01" value={l.taxPct} onChange={(e) => update(l.key, { taxPct: e.target.value })} />
                  </Field>
                </div>
                <div className="flex items-end sm:col-span-3">
                  <div className="w-full rounded-lg bg-white px-3 py-2 text-right text-sm font-bold text-slate-900 ring-1 ring-slate-200">
                    {formatMoney(
                      Math.round(
                        (Number(l.quantity) || 0) * toCents(l.unitPrice) * (1 - pctToBp(l.discountPct) / 10000) * (1 + pctToBp(l.taxPct) / 10000),
                      ),
                      symbol,
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={kind === "quotation" ? "Notes & terms" : "Notes & payment terms"} />
          <div className="space-y-3 p-4">
            <Field label="Notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible to the customer on the document" />
            </Field>
            <Field label={kind === "quotation" ? "Terms & conditions" : "Payment terms"}>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Summary" subtitle="Totals are recalculated on the server when saved" />
          <dl className="space-y-2 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-semibold text-slate-800">{formatMoney(totals.subtotal, symbol)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-semibold text-rose-600">− {formatMoney(totals.discount, symbol)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="font-semibold text-slate-800">{formatMoney(totals.tax, symbol)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base"><dt className="font-bold text-slate-900">Grand total</dt><dd className="font-black text-brand-700">{formatMoney(totals.total, symbol)}</dd></div>
          </dl>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
            <Button onClick={() => save("draft")} loading={saving} variant="secondary">Save as draft</Button>
            <Button onClick={() => save("sent")} loading={saving}>Save &amp; mark as sent</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
