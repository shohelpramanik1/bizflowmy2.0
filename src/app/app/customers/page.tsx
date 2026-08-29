"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import ResourceManager, { type ColumnDef } from "@/components/resource-manager";
import { Button } from "@/components/ui";
import { MY_STATES, formatMoney } from "@/lib/format";

type Row = { id: number; name: string; companyName: string | null; email: string | null; phone: string | null; whatsapp: string | null; city: string | null; state: string | null; address: string | null; postcode: string | null; country: string | null; taxNo: string | null; notes: string | null; invoiceCount: number; outstanding: number };

export default function CustomersPage() {
  const [symbol, setSymbol] = useState("RM");
  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setSymbol(d?.data?.business?.currencySymbol ?? "RM")).catch(() => {});
  }, []);

  const columns: ColumnDef<Row>[] = [
    { key: "name", label: "Customer", mobile: "title", render: (r) => (
      <Link href={`/app/customers/${r.id}`} className="font-semibold text-brand-700 hover:underline">{r.name}</Link>
    ) },
    { key: "company", label: "Company", render: (r) => <span className="text-sm text-slate-600">{r.companyName ?? "—"}</span> },
    { key: "contact", label: "Contact", render: (r) => (
      <span className="text-xs text-slate-500">{[r.phone, r.email].filter(Boolean).join(" · ") || "—"}</span>
    ) },
    { key: "location", label: "Location", render: (r) => <span className="text-xs text-slate-500">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</span> },
    { key: "invoices", label: "Invoices", className: "text-right", render: (r) => <span className="text-sm font-semibold">{r.invoiceCount}</span> },
    { key: "outstanding", label: "Outstanding", className: "text-right", mobile: "value", render: (r) => (
      <span className={`text-sm font-bold ${r.outstanding > 0 ? "text-amber-700" : "text-slate-400"}`}>{formatMoney(r.outstanding, symbol)}</span>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Your CRM — contacts, transaction history and outstanding balances."
        action={<a href="/api/reports/export?type=customers"><Button variant="secondary" size="sm">⬇ Export CSV</Button></a>}
      />
      <ResourceManager<Row>
        title="Customer"
        endpoint="/api/customers"
        createLabel="+ Add customer"
        emptyTitle="No customers yet"
        emptyDescription="Add your first customer to start creating quotations and invoices."
        columns={columns}
        filters={[{ key: "state", label: "All states", options: MY_STATES.map((s) => ({ value: s, label: s })) }]}
        mapRow={(raw) => {
          const c = raw.customer as Record<string, unknown>;
          return { ...(c as unknown as Row), invoiceCount: (raw.invoiceCount as number) ?? 0, outstanding: (raw.outstanding as number) ?? 0 };
        }}
        fromRow={(r) => ({
          name: r.name, companyName: r.companyName ?? "", email: r.email ?? "", phone: r.phone ?? "", whatsapp: r.whatsapp ?? "",
          address: r.address ?? "", city: r.city ?? "", state: r.state ?? "", postcode: r.postcode ?? "", country: r.country ?? "Malaysia",
          taxNo: r.taxNo ?? "", notes: r.notes ?? "",
        })}
        toPayload={(v) => ({
          name: v.name, companyName: v.companyName || null, email: v.email || null, phone: v.phone || null, whatsapp: v.whatsapp || null,
          address: v.address || null, city: v.city || null, state: v.state || null, postcode: v.postcode || null,
          country: v.country || "Malaysia", taxNo: v.taxNo || null, notes: v.notes || null,
        })}
        fields={[
          { key: "name", label: "Customer name", required: true },
          { key: "companyName", label: "Company name" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone", hint: "e.g. 012-345 6789" },
          { key: "whatsapp", label: "WhatsApp number" },
          { key: "taxNo", label: "Tax / SSM registration no." },
          { key: "address", label: "Address", type: "textarea", span: 2 },
          { key: "city", label: "City" },
          { key: "state", label: "State", type: "select", options: [{ value: "", label: "Select state" }, ...MY_STATES.map((s) => ({ value: s, label: s }))] },
          { key: "postcode", label: "Postcode" },
          { key: "country", label: "Country", defaultValue: "Malaysia" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ]}
      />
    </div>
  );
}
