"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Textarea, Td, Th, TableWrap, apiRequest, useToast } from "@/components/ui";
import { toCents, fromCents } from "@/lib/format";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "money" | "date" | "select" | "textarea" | "email" | "checkbox" | "percent";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  span?: 1 | 2;
  defaultValue?: string;
};

export type ColumnDef<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
  mobile?: "title" | "subtitle" | "meta" | "value" | "hide";
};

export default function ResourceManager<T extends { id: number }>({
  title,
  endpoint,
  fields,
  columns,
  mapRow,
  toPayload,
  fromRow,
  filters,
  emptyTitle,
  emptyDescription,
  createLabel,
  canWrite = true,
  extraActions,
  reloadKey,
}: {
  title: string;
  endpoint: string;
  fields: FieldDef[];
  columns: ColumnDef<T>[];
  mapRow: (raw: Record<string, unknown>) => T;
  toPayload: (values: Record<string, string>) => Record<string, unknown>;
  fromRow: (row: T) => Record<string, string>;
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[];
  emptyTitle: string;
  emptyDescription: string;
  createLabel: string;
  canWrite?: boolean;
  extraActions?: (row: T) => ReactNode;
  reloadKey?: string;
}) {
  const { push } = useToast();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterState, setFilterState] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const defaults = useMemo(() => {
    const v: Record<string, string> = {};
    for (const f of fields) v[f.key] = f.defaultValue ?? (f.type === "select" ? f.options?.[0]?.value ?? "" : f.type === "checkbox" ? "true" : "");
    return v;
  }, [fields]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, pageSize: "100" });
      for (const [k, v] of Object.entries(filterState)) if (v) params.set(k, v);
      const data = await apiRequest<{ items: Record<string, unknown>[] }>(`${endpoint}?${params.toString()}`);
      setRows(data.items.map(mapRow));
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to load data.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, q, JSON.stringify(filterState), reloadKey]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setValues(defaults);
    setError("");
    setOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    setValues({ ...defaults, ...fromRow(row) });
    setError("");
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(values);
      if (editing) {
        await apiRequest(`${endpoint}/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        push(`${title} updated.`);
      } else {
        await apiRequest(endpoint, { method: "POST", body: JSON.stringify(payload) });
        push(`${title} created.`);
      }
      setOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: T) {
    if (!confirm(`Remove this ${title.toLowerCase()}? Financial history is preserved.`)) return;
    try {
      await apiRequest(`${endpoint}/${row.id}`, { method: "DELETE" });
      push(`${title} removed.`);
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Unable to remove.", "error");
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.type === "checkbox" ? String((e.target as HTMLInputElement).checked) : e.target.value }));

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="max-w-xs" />
        {filters?.map((f) => (
          <Select key={f.key} value={filterState[f.key] ?? ""} onChange={(e) => setFilterState((s) => ({ ...s, [f.key]: e.target.value }))} className="max-w-[180px]">
            <option value="">{f.label}</option>
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-400">{rows.length} records</span>
          {canWrite && <Button size="sm" onClick={openCreate}>{createLabel}</Button>}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={canWrite ? <Button size="sm" onClick={openCreate}>{createLabel}</Button> : undefined} />
      ) : (
        <>
          <div className="hidden sm:block">
            <TableWrap>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  {columns.map((c) => <Th key={c.key} className={c.className}>{c.label}</Th>)}
                  {canWrite && <Th className="text-right">Actions</Th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50">
                    {columns.map((c) => <Td key={c.key} className={c.className}>{c.render(row)}</Td>)}
                    {canWrite && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {extraActions?.(row)}
                          <button onClick={() => openEdit(row)} className="rounded px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">Edit</button>
                          <button onClick={() => remove(row)} className="rounded px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">Delete</button>
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>

          <ul className="divide-y divide-slate-100 sm:hidden">
            {rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {columns.filter((c) => c.mobile !== "hide").map((c) => (
                      <div key={c.key} className={c.mobile === "title" ? "text-sm font-semibold text-slate-900" : "text-xs text-slate-500"}>
                        {c.render(row)}
                      </div>
                    ))}
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 flex-col gap-1">
                      {extraActions?.(row)}
                      <button onClick={() => openEdit(row)} className="rounded bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">Edit</button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${editing ? "Edit" : "New"} ${title.toLowerCase()}`}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="resource-form" loading={saving}>{editing ? "Save changes" : "Create"}</Button>
          </>
        }
      >
        <form id="resource-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{error}</div>}
          {fields.map((f) => (
            <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : ""}>
              <Field label={f.label} required={f.required} hint={f.hint}>
                {f.type === "select" ? (
                  <Select value={values[f.key] ?? ""} onChange={set(f.key)} required={f.required}>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : f.type === "textarea" ? (
                  <Textarea value={values[f.key] ?? ""} onChange={set(f.key)} required={f.required} />
                ) : f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 py-2">
                    <input type="checkbox" checked={values[f.key] === "true"} onChange={set(f.key)} className="h-4 w-4 rounded border-slate-300" />
                    <span className="text-sm text-slate-600">{f.hint ?? "Enabled"}</span>
                  </label>
                ) : (
                  <Input
                    type={f.type === "money" || f.type === "percent" || f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "email" ? "email" : "text"}
                    step={f.type === "money" || f.type === "percent" ? "0.01" : undefined}
                    value={values[f.key] ?? ""}
                    onChange={set(f.key)}
                    required={f.required}
                  />
                )}
              </Field>
            </div>
          ))}
        </form>
      </Modal>
    </Card>
  );
}

export const money = { to: toCents, from: fromCents };
export { Badge };
