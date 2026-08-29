"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, CardHeader, Field, Input, Select, Tabs, Textarea, apiRequest, useToast } from "@/components/ui";
import { BUSINESS_TYPES, MY_STATES, bpToPct, pctToBp } from "@/lib/format";

type Biz = Record<string, string | number | boolean | null>;

export default function SettingsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState("business");
  const [b, setB] = useState<Biz | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setB(d?.data?.business ?? null)).catch(() => {});
  }, []);

  const set = (k: string, v: string | number | boolean | null) => setB((s) => (s ? { ...s, [k]: v } : s));

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      await apiRequest("/api/businesses", { method: "PATCH", body: JSON.stringify(patch) });
      push("Settings saved.");
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!b) return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  const s = (k: string) => String(b[k] ?? "");

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Business profile, documents, tax, payments and data controls." />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: "business", label: "Business" }, { key: "documents", label: "Documents" },
        { key: "tax", label: "Tax (Malaysia)" }, { key: "payments", label: "Payments" },
        { key: "reminders", label: "Reminders" }, { key: "data", label: "Data & privacy" },
      ]} />

      {tab === "business" && (
        <Card>
          <CardHeader title="Business profile" subtitle="Shown on every quotation, invoice and receipt." />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Business name" required><Input value={s("name")} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Business type"><Select value={s("businessType")} onChange={(e) => set("businessType", e.target.value)}>{BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Registration number (SSM)"><Input value={s("registrationNo")} onChange={(e) => set("registrationNo", e.target.value)} placeholder="202301234567 (1234567-A)" /></Field>
            <Field label="Logo URL"><Input value={s("logoUrl")} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…/logo.png" /></Field>
            <div className="sm:col-span-2"><Field label="Address"><Textarea value={s("address")} onChange={(e) => set("address", e.target.value)} /></Field></div>
            <Field label="City"><Input value={s("city")} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="State"><Select value={s("state")} onChange={(e) => set("state", e.target.value)}><option value="">Select</option>{MY_STATES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Postcode"><Input value={s("postcode")} onChange={(e) => set("postcode", e.target.value)} /></Field>
            <Field label="Country"><Input value={s("country")} onChange={(e) => set("country", e.target.value)} /></Field>
            <Field label="Phone"><Input value={s("phone")} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email"><Input value={s("email")} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Website"><Input value={s("website")} onChange={(e) => set("website", e.target.value)} /></Field>
            <Field label="Public booking page"><Input readOnly value={`/book/${s("slug")}`} /></Field>
          </div>
          <div className="border-t border-slate-100 p-4">
            <Button loading={saving} onClick={() => save({
              name: s("name"), businessType: s("businessType"), registrationNo: s("registrationNo") || null,
              logoUrl: s("logoUrl") || null, address: s("address") || null, city: s("city") || null,
              state: s("state") || null, postcode: s("postcode") || null, country: s("country") || "Malaysia",
              phone: s("phone") || null, email: s("email") || null, website: s("website") || null,
            })}>Save business profile</Button>
          </div>
        </Card>
      )}

      {tab === "documents" && (
        <Card>
          <CardHeader title="Document defaults" subtitle="Templates, numbering and default terms." />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Quotation template"><Select value={s("quotationTemplate")} onChange={(e) => set("quotationTemplate", e.target.value)}><option value="modern">Modern (brand colour)</option><option value="classic">Classic (dark)</option><option value="minimal">Minimal (mono)</option></Select></Field>
            <Field label="Invoice template"><Select value={s("invoiceTemplate")} onChange={(e) => set("invoiceTemplate", e.target.value)}><option value="modern">Modern (brand colour)</option><option value="classic">Classic (dark)</option><option value="minimal">Minimal (mono)</option></Select></Field>
            <Field label="Default payment terms"><Input value={s("defaultPaymentTerms")} onChange={(e) => set("defaultPaymentTerms", e.target.value)} /></Field>
            <Field label="Payment term (days)"><Input type="number" min="0" value={s("paymentTermDays")} onChange={(e) => set("paymentTermDays", e.target.value)} /></Field>
            <div className="sm:col-span-2"><Field label="Bank / payment instructions" hint="Printed on every invoice"><Textarea value={s("bankInfo")} onChange={(e) => set("bankInfo", e.target.value)} placeholder={"Maybank 5123 4567 8901\nAccount name: Kreatif Studio Enterprise\nDuitNow QR available on request"} /></Field></div>
            <div className="sm:col-span-2"><Field label="Default quotation terms & conditions"><Textarea value={s("quotationTerms")} onChange={(e) => set("quotationTerms", e.target.value)} /></Field></div>
            <div className="sm:col-span-2"><Field label="Default invoice notes"><Textarea value={s("invoiceNotes")} onChange={(e) => set("invoiceNotes", e.target.value)} /></Field></div>
          </div>
          <div className="border-t border-slate-100 p-4">
            <Button loading={saving} onClick={() => save({
              quotationTemplate: s("quotationTemplate"), invoiceTemplate: s("invoiceTemplate"),
              defaultPaymentTerms: s("defaultPaymentTerms"), paymentTermDays: Number(s("paymentTermDays")) || 30,
              bankInfo: s("bankInfo") || null, quotationTerms: s("quotationTerms") || null, invoiceNotes: s("invoiceNotes") || null,
            })}>Save document defaults</Button>
          </div>
        </Card>
      )}

      {tab === "tax" && (
        <Card>
          <CardHeader title="Tax configuration" subtitle="Fully configurable — nothing is hard-coded." />
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <Field label="Apply tax by default"><Select value={String(b.taxEnabled)} onChange={(e) => set("taxEnabled", e.target.value === "true")}><option value="false">No</option><option value="true">Yes</option></Select></Field>
            <Field label="Tax label"><Input value={s("taxLabel")} onChange={(e) => set("taxLabel", e.target.value)} placeholder="SST / Service Tax / GST" /></Field>
            <Field label="Default tax rate (%)"><Input type="number" step="0.01" min="0" max="100" value={bpToPct(Number(b.taxRateBp) || 0)} onChange={(e) => set("taxRateBp", pctToBp(e.target.value))} /></Field>
          </div>
          <div className="mx-4 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <strong>Disclaimer:</strong> BizFlow MY does not provide tax or legal advice. Tax rates, labels and treatment are administrator-configurable and must be verified against current Malaysian requirements (LHDN, RMCD / SST regulations) before issuing documents.
          </div>
          <div className="border-t border-slate-100 p-4">
            <Button loading={saving} onClick={() => save({ taxEnabled: Boolean(b.taxEnabled), taxLabel: s("taxLabel"), taxRateBp: Number(b.taxRateBp) || 0 })}>Save tax settings</Button>
          </div>
        </Card>
      )}

      {tab === "payments" && (
        <Card>
          <CardHeader title="Payment gateway" subtitle="Provider-agnostic abstraction — connect a gateway when you are ready." />
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <Field label="Active gateway" hint="Additional providers can be added without code changes to documents">
              <Select value={s("paymentGateway")} onChange={(e) => set("paymentGateway", e.target.value)}>
                <option value="none">Not connected (manual recording)</option>
                <option value="fpx">FPX (online banking)</option>
                <option value="duitnow">DuitNow QR</option>
                <option value="card">Credit / debit card</option>
                <option value="ewallet">E-wallet</option>
              </Select>
            </Field>
            <Field label="Online booking page"><Select value={String(b.bookingEnabled)} onChange={(e) => set("bookingEnabled", e.target.value === "true")}><option value="true">Enabled</option><option value="false">Disabled</option></Select></Field>
          </div>
          <div className="border-t border-slate-100 p-4">
            <Button loading={saving} onClick={() => save({ paymentGateway: s("paymentGateway"), bookingEnabled: Boolean(b.bookingEnabled) })}>Save payment settings</Button>
          </div>
        </Card>
      )}

      {tab === "reminders" && (
        <Card>
          <CardHeader title="Payment reminders" subtitle="Stages relative to the due date: −3, 0, +3, +7 and +14 days." />
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              {[-3, 0, 3, 7, 14].map((d) => (
                <span key={d} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  {d < 0 ? `${Math.abs(d)} days before due` : d === 0 ? "On due date" : `${d} days overdue`}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-500">Run the sweep to queue reminder emails for every overdue invoice and automatically create follow-up tasks.</p>
            <Button onClick={async () => {
              try {
                const r = await apiRequest<{ sent: number }>("/api/reminders", { method: "POST" });
                push(`${r.sent} reminder(s) queued and follow-up tasks created.`);
              } catch (e) { push(e instanceof Error ? e.message : "Unable to run reminders.", "error"); }
            }}>Run reminder sweep now</Button>
          </div>
        </Card>
      )}

      {tab === "data" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Export my data" subtitle="Download your business data in portable CSV format." />
            <div className="flex flex-wrap gap-2 p-4">
              {["customers", "invoices", "quotations", "payments", "expenses"].map((t) => (
                <a key={t} href={`/api/reports/export?type=${t}&preset=year`}><Button size="sm" variant="secondary">⬇ {t}</Button></a>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Privacy controls" subtitle="Configurable controls — review our legal pages." />
            <div className="space-y-2 p-4 text-sm text-slate-600">
              <p>• Data is isolated per business workspace; members can only access their own tenant.</p>
              <p>• Passwords are hashed with scrypt and sessions are server-side and revocable.</p>
              <p>• Every financial action is written to an immutable activity log.</p>
              <p>• Automated database backups should be configured at the infrastructure level.</p>
              <p className="pt-2">
                <a href="/privacy" className="font-semibold text-brand-700 hover:underline">Privacy Policy</a>
                {" · "}
                <a href="/terms" className="font-semibold text-brand-700 hover:underline">Terms of Service</a>
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
