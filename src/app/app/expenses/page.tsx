"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import ResourceManager, { type ColumnDef } from "@/components/resource-manager";
import { Button } from "@/components/ui";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS, formatDate, formatMoney, fromCents, toCents, today } from "@/lib/format";

type Row = { id: number; name: string; category: string; supplier: string | null; amountCents: number; taxCents: number; expenseDate: string; method: string | null; receiptUrl: string | null; notes: string | null };

export default function ExpensesPage() {
  const [symbol, setSymbol] = useState("RM");
  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => setSymbol(d?.data?.business?.currencySymbol ?? "RM")).catch(() => {});
  }, []);

  const columns: ColumnDef<Row>[] = [
    { key: "date", label: "Date", render: (r) => <span className="text-xs text-slate-500">{formatDate(r.expenseDate)}</span> },
    { key: "name", label: "Expense", mobile: "title", render: (r) => <span className="font-semibold text-slate-800">{r.name}</span> },
    { key: "category", label: "Category", render: (r) => <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{r.category}</span> },
    { key: "supplier", label: "Supplier", render: (r) => <span className="text-xs text-slate-500">{r.supplier ?? "—"}</span> },
    { key: "method", label: "Method", render: (r) => <span className="text-xs capitalize text-slate-500">{(r.method ?? "").replace("_", " ")}</span> },
    { key: "amount", label: "Amount", className: "text-right", mobile: "value", render: (r) => <span className="font-bold text-slate-900">{formatMoney(r.amountCents + r.taxCents, symbol)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track spending so your dashboard shows true net profit."
        action={<a href="/api/reports/export?type=expenses"><Button variant="secondary" size="sm">⬇ Export CSV</Button></a>}
      />
      <ResourceManager<Row>
        title="Expense"
        endpoint="/api/expenses"
        createLabel="+ Add expense"
        emptyTitle="No expenses recorded"
        emptyDescription="Record business spending to calculate accurate profit."
        columns={columns}
        filters={[{ key: "category", label: "All categories", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })) }]}
        mapRow={(raw) => raw as unknown as Row}
        fromRow={(r) => ({
          name: r.name, category: r.category, supplier: r.supplier ?? "", amount: fromCents(r.amountCents),
          tax: fromCents(r.taxCents), expenseDate: r.expenseDate, method: r.method ?? "bank_transfer",
          receiptUrl: r.receiptUrl ?? "", notes: r.notes ?? "",
        })}
        toPayload={(v) => ({
          name: v.name, category: v.category, supplier: v.supplier || null, amountCents: toCents(v.amount),
          taxCents: toCents(v.tax), expenseDate: v.expenseDate || today(), method: v.method,
          receiptUrl: v.receiptUrl || null, notes: v.notes || null,
        })}
        fields={[
          { key: "name", label: "Expense name", required: true },
          { key: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })) },
          { key: "supplier", label: "Supplier / vendor" },
          { key: "amount", label: "Amount", type: "money", required: true, defaultValue: "0.00" },
          { key: "tax", label: "Tax amount", type: "money", defaultValue: "0.00" },
          { key: "expenseDate", label: "Date", type: "date", required: true, defaultValue: today() },
          { key: "method", label: "Payment method", type: "select", options: PAYMENT_METHODS },
          { key: "receiptUrl", label: "Receipt link", hint: "Link to the stored receipt file" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ]}
      />
    </div>
  );
}
