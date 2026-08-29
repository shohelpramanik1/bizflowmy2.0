"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, Select, Td, Th, TableWrap, apiRequest } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { statusLabel, statusTone } from "@/lib/status";

type Row = {
  id: number;
  number: string;
  issueDate: string;
  endDate: string;
  status: string;
  totalCents: number;
  paidCents?: number;
  customerName: string;
  customerCompany: string | null;
};

export default function DocumentList({ kind, symbol }: { kind: "quotation" | "invoice"; symbol: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const base = kind === "quotation" ? "/api/quotations" : "/api/invoices";
  const href = kind === "quotation" ? "/app/quotations" : "/app/invoices";
  const statuses = kind === "quotation"
    ? ["all", "draft", "sent", "viewed", "accepted", "rejected", "expired", "converted"]
    : ["all", "draft", "sent", "viewed", "partially_paid", "paid", "overdue", "cancelled"];

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiRequest<{ items: Record<string, unknown>[]; total: number }>(
          `${base}?q=${encodeURIComponent(q)}&status=${status}&page=${page}&pageSize=25`,
        );
        setRows(
          data.items.map((raw) => {
            const doc = (kind === "quotation" ? raw.quotation : raw.invoice) as Record<string, unknown>;
            return {
              id: doc.id as number,
              number: doc.number as string,
              issueDate: doc.issueDate as string,
              endDate: (kind === "quotation" ? doc.expiryDate : doc.dueDate) as string,
              status: doc.status as string,
              totalCents: doc.totalCents as number,
              paidCents: doc.paidCents as number | undefined,
              customerName: raw.customerName as string,
              customerCompany: (raw.customerCompany as string | null) ?? null,
            };
          }),
        );
        setTotal(data.total);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, status, page, base, kind]);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={`Search ${kind}s or customers…`} className="max-w-xs" />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="max-w-[180px]">
          {statuses.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : statusLabel(s)}</option>)}
        </Select>
        <span className="ml-auto text-xs text-slate-400">{total} total</span>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={`No ${kind}s found`}
          description={`Create your first ${kind} to get started.`}
          action={<Link href={`${href}/new`}><Button size="sm">New {kind}</Button></Link>}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <TableWrap>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <Th>Number</Th><Th>Customer</Th><Th>Issued</Th>
                  <Th>{kind === "quotation" ? "Expires" : "Due"}</Th>
                  <Th className="text-right">Total</Th>
                  {kind === "invoice" && <Th className="text-right">Balance</Th>}
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-slate-50">
                    <Td><Link href={`${href}/${r.id}`} className="font-semibold text-brand-700 hover:underline">{r.number}</Link></Td>
                    <Td>
                      <span className="block text-sm font-medium text-slate-800">{r.customerName}</span>
                      {r.customerCompany && <span className="block text-xs text-slate-400">{r.customerCompany}</span>}
                    </Td>
                    <Td className="text-xs">{formatDate(r.issueDate)}</Td>
                    <Td className="text-xs">{formatDate(r.endDate)}</Td>
                    <Td className="text-right font-bold">{formatMoney(r.totalCents, symbol)}</Td>
                    {kind === "invoice" && (
                      <Td className="text-right font-semibold text-amber-700">{formatMoney(r.totalCents - (r.paidCents ?? 0), symbol)}</Td>
                    )}
                    <Td><Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`${href}/${r.id}`} className="block px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-brand-700">{r.number}</span>
                    <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-700">{r.customerName}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDate(r.issueDate)}</span>
                    <span className="text-sm font-bold text-slate-900">{formatMoney(r.totalCents, symbol)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {total > 25 && (
            <div className="flex items-center justify-between border-t border-slate-100 p-3">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-xs text-slate-500">Page {page} of {Math.ceil(total / 25)}</span>
              <Button size="sm" variant="secondary" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
