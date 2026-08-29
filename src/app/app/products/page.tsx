"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import ResourceManager, { type ColumnDef } from "@/components/resource-manager";
import { Badge } from "@/components/ui";
import { bpToPct, formatMoney, fromCents, pctToBp, toCents } from "@/lib/format";

type Row = {
  id: number; name: string; sku: string | null; description: string | null; category: string | null; unit: string | null;
  kind: string; priceCents: number; costCents: number; taxRateBp: number; discountBp: number; durationMinutes: number | null;
  bookable: boolean; active: boolean;
};

export default function ProductsPage() {
  const [symbol, setSymbol] = useState("RM");
  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setSymbol(d?.data?.business?.currencySymbol ?? "RM")).catch(() => {});
  }, []);

  const columns: ColumnDef<Row>[] = [
    { key: "name", label: "Name", mobile: "title", render: (r) => (
      <div>
        <span className="font-semibold text-slate-800">{r.name}</span>
        {r.sku && <span className="ml-2 text-xs text-slate-400">{r.sku}</span>}
      </div>
    ) },
    { key: "kind", label: "Type", render: (r) => <Badge tone={r.kind === "service" ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20" : "bg-slate-100 text-slate-600 ring-slate-500/20"}>{r.kind}</Badge> },
    { key: "category", label: "Category", render: (r) => <span className="text-xs text-slate-500">{r.category ?? "—"}</span> },
    { key: "price", label: "Selling price", className: "text-right", mobile: "value", render: (r) => <span className="font-bold text-slate-900">{formatMoney(r.priceCents, symbol)}</span> },
    { key: "cost", label: "Cost", className: "text-right", render: (r) => <span className="text-xs text-slate-500">{formatMoney(r.costCents, symbol)}</span> },
    { key: "tax", label: "Tax", className: "text-right", render: (r) => <span className="text-xs text-slate-500">{bpToPct(r.taxRateBp)}%</span> },
    { key: "status", label: "Status", render: (r) => (
      <div className="flex gap-1">
        <Badge tone={r.active ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-500/20"}>{r.active ? "Active" : "Inactive"}</Badge>
        {r.bookable && <Badge tone="bg-brand-50 text-brand-700 ring-brand-600/20">Bookable</Badge>}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Products & Services" subtitle="Reusable line items you can drop into any quotation or invoice." />
      <ResourceManager<Row>
        title="Item"
        endpoint="/api/products"
        createLabel="+ Add item"
        emptyTitle="No products or services yet"
        emptyDescription="Add items like “Website Development — RM2,500” so quoting takes seconds."
        columns={columns}
        mapRow={(raw) => raw as unknown as Row}
        fromRow={(r) => ({
          name: r.name, sku: r.sku ?? "", description: r.description ?? "", category: r.category ?? "", unit: r.unit ?? "unit",
          kind: r.kind, price: fromCents(r.priceCents), cost: fromCents(r.costCents), tax: bpToPct(r.taxRateBp),
          discount: bpToPct(r.discountBp), durationMinutes: String(r.durationMinutes ?? 60),
          bookable: String(r.bookable), active: String(r.active),
        })}
        toPayload={(v) => ({
          name: v.name, sku: v.sku || null, description: v.description || null, category: v.category || null, unit: v.unit || "unit",
          kind: v.kind === "product" ? "product" : "service", priceCents: toCents(v.price), costCents: toCents(v.cost),
          taxRateBp: pctToBp(v.tax), discountBp: pctToBp(v.discount), durationMinutes: Number(v.durationMinutes) || 60,
          bookable: v.bookable === "true", active: v.active === "true",
        })}
        fields={[
          { key: "name", label: "Name", required: true },
          { key: "sku", label: "SKU / code" },
          { key: "kind", label: "Type", type: "select", options: [{ value: "service", label: "Service" }, { value: "product", label: "Product" }] },
          { key: "category", label: "Category", hint: "e.g. Design, Development, Maintenance" },
          { key: "price", label: "Selling price", type: "money", required: true, defaultValue: "0.00" },
          { key: "cost", label: "Cost price", type: "money", defaultValue: "0.00" },
          { key: "tax", label: "Tax %", type: "percent", defaultValue: "0" },
          { key: "discount", label: "Default discount %", type: "percent", defaultValue: "0" },
          { key: "unit", label: "Unit", defaultValue: "unit", hint: "unit, hour, day, project…" },
          { key: "durationMinutes", label: "Booking duration (minutes)", type: "number", defaultValue: "60" },
          { key: "bookable", label: "Available for online booking", type: "checkbox", defaultValue: "false", hint: "Show on the public booking page" },
          { key: "active", label: "Active", type: "checkbox", defaultValue: "true", hint: "Available when creating documents" },
          { key: "description", label: "Description", type: "textarea", span: 2 },
        ]}
      />
    </div>
  );
}
