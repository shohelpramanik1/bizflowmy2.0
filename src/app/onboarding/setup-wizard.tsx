"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Select, Textarea, ToastProvider, apiRequest, cx, useToast } from "@/components/ui";

type Values = {
  name: string; logoUrl: string; registrationNo: string; address: string;
  phone: string; email: string; website: string; defaultPaymentTerms: string;
  quotationTemplate: string; invoiceTemplate: string;
};

const STEPS: { key: keyof Values; title: string; hint: string; type?: "textarea" | "select" }[] = [
  { key: "name", title: "Business name", hint: "This appears on every document you send." },
  { key: "logoUrl", title: "Business logo", hint: "Paste a link to your logo image (optional)." },
  { key: "registrationNo", title: "Business registration number", hint: "Your SSM number, e.g. 202301234567 (1234567-A)." },
  { key: "address", title: "Business address", hint: "Full Malaysian address including postcode and state.", type: "textarea" },
  { key: "phone", title: "Phone number", hint: "e.g. 012-345 6789" },
  { key: "email", title: "Email", hint: "Where customers should reply." },
  { key: "website", title: "Website", hint: "Optional." },
  { key: "defaultPaymentTerms", title: "Default payment terms", hint: "e.g. Payment due within 30 days." },
  { key: "quotationTemplate", title: "Default quotation template", hint: "You can change this any time.", type: "select" },
  { key: "invoiceTemplate", title: "Default invoice template", hint: "You can change this any time.", type: "select" },
];

function Wizard({ initial }: { initial: Values }) {
  const router = useRouter();
  const { push } = useToast();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const current = STEPS[step];

  async function finish() {
    setSaving(true);
    try {
      await apiRequest("/api/businesses", {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name, logoUrl: values.logoUrl || null, registrationNo: values.registrationNo || null,
          address: values.address || null, phone: values.phone || null, email: values.email || null,
          website: values.website || null, defaultPaymentTerms: values.defaultPaymentTerms || null,
          quotationTemplate: values.quotationTemplate, invoiceTemplate: values.invoiceTemplate,
          setupCompleted: true,
        }),
      });
      push("Business setup saved.");
      router.push("/app");
      router.refresh();
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to save.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s.key} className={cx("h-1.5 flex-1 rounded-full transition", i <= step ? "bg-brand-600" : "bg-slate-200")} />
        ))}
      </div>
      <p className="text-xs font-bold uppercase tracking-wide text-brand-600">Step {step + 1} of {STEPS.length}</p>
      <h2 className="mt-1 text-xl font-black text-slate-900">{current.title}</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">{current.hint}</p>

      <Field label={current.title}>
        {current.type === "textarea" ? (
          <Textarea value={values[current.key]} onChange={(e) => setValues((v) => ({ ...v, [current.key]: e.target.value }))} />
        ) : current.type === "select" ? (
          <Select value={values[current.key]} onChange={(e) => setValues((v) => ({ ...v, [current.key]: e.target.value }))}>
            <option value="modern">Modern (brand colour header)</option>
            <option value="classic">Classic (dark header)</option>
            <option value="minimal">Minimal (mono)</option>
          </Select>
        ) : (
          <Input value={values[current.key]} onChange={(e) => setValues((v) => ({ ...v, [current.key]: e.target.value }))} />
        )}
      </Field>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>← Back</Button>
        {step < STEPS.length - 1 ? (
          <>
            <Button onClick={() => setStep((s) => s + 1)}>Continue →</Button>
            <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>Skip this</Button>
          </>
        ) : (
          <Button loading={saving} onClick={finish}>Finish setup ✓</Button>
        )}
      </div>
    </div>
  );
}

export default function SetupWizard({ initial }: { initial: Values }) {
  return (
    <ToastProvider>
      <Wizard initial={initial} />
    </ToastProvider>
  );
}
