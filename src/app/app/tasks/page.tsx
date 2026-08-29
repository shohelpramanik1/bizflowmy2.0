"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Select, Tabs, Textarea, Td, Th, TableWrap, apiRequest, cx, useToast } from "@/components/ui";
import { formatDate, today } from "@/lib/format";

type Task = {
  id: number; title: string; description: string | null; status: string; priority: string;
  dueDate: string | null; startDate: string | null; customerId: number | null; assigneeId: number | null;
  estimatedHours: number | null; actualHours: number | null; notes: string | null;
};
type Row = { task: Task; customerName: string | null; assigneeName: string | null };

const COLUMNS = [
  { key: "todo", label: "To Do", color: "border-slate-300" },
  { key: "in_progress", label: "In Progress", color: "border-amber-400" },
  { key: "review", label: "Review", color: "border-indigo-400" },
  { key: "completed", label: "Completed", color: "border-emerald-400" },
];

const PRIORITY_TONE: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 ring-slate-500/20",
  medium: "bg-blue-50 text-blue-700 ring-blue-600/20",
  high: "bg-amber-50 text-amber-700 ring-amber-600/20",
  urgent: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export default function TasksPage() {
  const { push } = useToast();
  const [view, setView] = useState("kanban");
  const [rows, setRows] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<{ id: number; name: string }[]>([]);
  const [team, setTeam] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", description: "", customerId: "", assigneeId: "", priority: "medium", status: "todo", startDate: "", dueDate: "", estimatedHours: "", actualHours: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, m] = await Promise.all([
        apiRequest<{ items: Row[] }>("/api/tasks"),
        apiRequest<{ items: { customer: { id: number; name: string } }[] }>("/api/customers?pageSize=100"),
        apiRequest<{ items: { membership: { id: number; name: string | null; status: string } }[] }>("/api/team").catch(() => ({ items: [] })),
      ]);
      setRows(t.items);
      setCustomers(c.items.map((x) => x.customer));
      setTeam(m.items.filter((x) => x.membership.status === "active").map((x) => ({ id: x.membership.id, name: x.membership.name ?? "Member" })));
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to load tasks.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm({ title: "", description: "", customerId: "", assigneeId: "", priority: "medium", status: "todo", startDate: "", dueDate: today(), estimatedHours: "", actualHours: "", notes: "" });
    setOpen(true);
  }

  function openEdit(t: Task) {
    setEditing(t);
    setForm({
      title: t.title, description: t.description ?? "", customerId: t.customerId ? String(t.customerId) : "",
      assigneeId: t.assigneeId ? String(t.assigneeId) : "", priority: t.priority, status: t.status,
      startDate: t.startDate ?? "", dueDate: t.dueDate ?? "", estimatedHours: t.estimatedHours ? String(t.estimatedHours) : "",
      actualHours: t.actualHours ? String(t.actualHours) : "", notes: t.notes ?? "",
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title, description: form.description || null,
      customerId: form.customerId ? Number(form.customerId) : null,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      priority: form.priority, status: form.status,
      startDate: form.startDate || null, dueDate: form.dueDate || null,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
      actualHours: form.actualHours ? Number(form.actualHours) : null,
      notes: form.notes || null,
    };
    try {
      if (editing) await apiRequest(`/api/tasks/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await apiRequest("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
      push(editing ? "Task updated." : "Task created.");
      setOpen(false);
      load();
    } catch (err) {
      push(err instanceof Error ? err.message : "Unable to save the task.", "error");
    }
  }

  async function move(id: number, status: string) {
    setRows((rs) => rs.map((r) => (r.task.id === id ? { ...r, task: { ...r.task, status } } : r)));
    try {
      await apiRequest(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch {
      load();
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this task?")) return;
    await apiRequest(`/api/tasks/${id}`, { method: "DELETE" });
    push("Task deleted.");
    load();
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Personal, customer, project and team tasks — list or Kanban."
        action={
          <>
            <Tabs active={view} onChange={setView} tabs={[{ key: "kanban", label: "Kanban" }, { key: "list", label: "List" }]} />
            <Button size="sm" onClick={openNew}>+ New task</Button>
          </>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-4">{COLUMNS.map((c) => <div key={c.key} className="h-64 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : view === "kanban" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = rows.filter((r) => r.task.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) move(dragId, col.key); setDragId(null); }}
                className={cx("rounded-2xl border-t-4 bg-slate-100/70 p-2.5", col.color)}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{col.label}</p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map(({ task, customerName, assigneeName }) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onClick={() => openEdit(task)}
                      className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug text-slate-800">{task.title}</p>
                        <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                      </div>
                      {customerName && <p className="mt-1 text-xs text-brand-700">👤 {customerName}</p>}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date"}</span>
                        {assigneeName && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{assigneeName.split(" ")[0]}</span>}
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p className="px-1 py-6 text-center text-xs text-slate-400">Drop tasks here</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          {rows.length === 0 ? (
            <EmptyState title="No tasks yet" description="Create tasks and link them to customers to manage the full workflow." action={<Button size="sm" onClick={openNew}>New task</Button>} />
          ) : (
            <TableWrap>
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr><Th>Task</Th><Th>Customer</Th><Th>Assignee</Th><Th>Priority</Th><Th>Due</Th><Th>Status</Th><Th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(({ task, customerName, assigneeName }) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <Td><button onClick={() => openEdit(task)} className="text-left font-semibold text-slate-800 hover:text-brand-700">{task.title}</button></Td>
                    <Td className="text-xs text-slate-500">{customerName ?? "—"}</Td>
                    <Td className="text-xs text-slate-500">{assigneeName ?? "Unassigned"}</Td>
                    <Td><Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge></Td>
                    <Td className="text-xs">{task.dueDate ? formatDate(task.dueDate) : "—"}</Td>
                    <Td>
                      <Select value={task.status} onChange={(e) => move(task.id, e.target.value)} className="py-1 text-xs">
                        {["todo", "in_progress", "review", "waiting", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                      </Select>
                    </Td>
                    <Td className="text-right"><button onClick={() => remove(task.id)} className="text-xs font-semibold text-rose-600 hover:underline">Delete</button></Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit task" : "New task"}
        size="lg"
        footer={
          <>
            {editing && <Button variant="danger" onClick={() => { setOpen(false); remove(editing.id); }}>Delete</Button>}
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button form="tf" type="submit">{editing ? "Save changes" : "Create task"}</Button>
          </>
        }
      >
        <form id="tf" onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Task name" required><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required /></Field></div>
          <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field></div>
          <Field label="Customer">
            <Select value={form.customerId} onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}>
              <option value="">None (internal)</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Assign to">
            <Select value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
              <option value="">Unassigned</option>
              {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {["todo", "in_progress", "review", "waiting", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </Select>
          </Field>
          <Field label="Start date"><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></Field>
          <Field label="Due date"><Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} /></Field>
          <Field label="Estimated hours"><Input type="number" min="0" value={form.estimatedHours} onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} /></Field>
          <Field label="Actual hours"><Input type="number" min="0" value={form.actualHours} onChange={(e) => setForm((f) => ({ ...f, actualHours: e.target.value }))} /></Field>
          <div className="sm:col-span-2"><Field label="Notes"><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field></div>
        </form>
      </Modal>
    </div>
  );
}
