"use client";

import { PageHeader } from "@/components/page-header";
import ResourceManager, { type ColumnDef } from "@/components/resource-manager";
import { formatDate } from "@/lib/format";

type Row = { id: number; name: string; type: string; url: string | null; notes: string | null; createdAt: string; customerName: string | null; customerId: number | null };

const TYPES = ["quotation", "invoice", "receipt", "expense_receipt", "contract", "other"];

export default function DocumentsPage() {
  const columns: ColumnDef<Row>[] = [
    { key: "name", label: "Document", mobile: "title", render: (r) => (
      r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">{r.name}</a>
           : <span className="font-semibold text-slate-800">{r.name}</span>
    ) },
    { key: "type", label: "Type", render: (r) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">{r.type.replace("_", " ")}</span> },
    { key: "customer", label: "Customer", render: (r) => <span className="text-xs text-slate-500">{r.customerName ?? "—"}</span> },
    { key: "date", label: "Added", render: (r) => <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Documents" subtitle="One place for contracts, receipts and any other business files." />
      <ResourceManager<Row>
        title="Document"
        endpoint="/api/documents"
        createLabel="+ Add document"
        emptyTitle="No documents stored"
        emptyDescription="Link contracts, receipts and files so your whole team can find them."
        columns={columns}
        filters={[{ key: "type", label: "All types", options: TYPES.map((t) => ({ value: t, label: t.replace("_", " ") })) }]}
        mapRow={(raw) => {
          const d = raw.document as Record<string, unknown>;
          return { ...(d as unknown as Row), customerName: (raw.customerName as string | null) ?? null };
        }}
        fromRow={(r) => ({ name: r.name, type: r.type, url: r.url ?? "", notes: r.notes ?? "" })}
        toPayload={(v) => ({ name: v.name, type: v.type, url: v.url || null, notes: v.notes || null })}
        fields={[
          { key: "name", label: "Document name", required: true, span: 2 },
          { key: "type", label: "Type", type: "select", options: TYPES.map((t) => ({ value: t, label: t.replace("_", " ") })) },
          { key: "url", label: "File link (S3 / Drive / Dropbox)", hint: "Uploads go to S3-compatible storage in production" },
          { key: "notes", label: "Notes", type: "textarea", span: 2 },
        ]}
      />
    </div>
  );
}
