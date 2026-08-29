"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Field, Input, Modal, Select, Td, Th, TableWrap, apiRequest, useToast } from "@/components/ui";
import { ROLES } from "@/lib/rbac";

type Member = {
  id: number; name: string | null; inviteEmail: string | null; phone: string | null;
  role: string; position: string | null; department: string | null; status: string;
};

export default function TeamManager({ members, canWrite }: { members: Member[]; canWrite: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "staff", position: "", department: "", tempPassword: "" });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiRequest("/api/team", { method: "POST", body: JSON.stringify({ ...form, tempPassword: form.tempPassword || undefined }) });
      push("Team member invited.");
      setOpen(false);
      setForm({ name: "", email: "", phone: "", role: "staff", position: "", department: "", tempPassword: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to invite.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id: number, role: string) {
    try {
      await apiRequest(`/api/team/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      push("Role updated.");
      router.refresh();
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to update role.", "error");
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this team member's access?")) return;
    try {
      await apiRequest(`/api/team/${id}`, { method: "DELETE" });
      push("Access removed.");
      router.refresh();
    } catch (e) {
      push(e instanceof Error ? e.message : "Unable to remove.", "error");
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
        <p className="text-sm font-semibold text-slate-800">{members.length} team member(s)</p>
        {canWrite && <Button size="sm" onClick={() => setOpen(true)}>+ Invite team member</Button>}
      </div>
      <TableWrap>
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Position</Th><Th>Department</Th><Th>Role</Th><Th>Status</Th>{canWrite && <Th />}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <Td className="font-semibold text-slate-800">{m.name ?? "—"}</Td>
              <Td className="text-xs text-slate-500">{m.inviteEmail ?? "—"}</Td>
              <Td className="text-xs text-slate-500">{m.phone ?? "—"}</Td>
              <Td className="text-xs">{m.position ?? "—"}</Td>
              <Td className="text-xs">{m.department ?? "—"}</Td>
              <Td>
                {canWrite && m.role !== "owner" ? (
                  <Select value={m.role} onChange={(e) => changeRole(m.id, e.target.value)} className="py-1 text-xs">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </Select>
                ) : (
                  <Badge tone="bg-brand-50 text-brand-700 ring-brand-600/20">{m.role}</Badge>
                )}
              </Td>
              <Td><Badge tone={m.status === "active" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-500/20"}>{m.status}</Badge></Td>
              {canWrite && (
                <Td className="text-right">
                  {m.role !== "owner" && <button onClick={() => remove(m.id)} className="text-xs font-semibold text-rose-600 hover:underline">Remove</button>}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <div className="grid gap-2 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-lg bg-slate-50 p-2.5">
            <p className="text-xs font-bold capitalize text-slate-700">{r.label}</p>
            <p className="text-[11px] text-slate-500">{r.description}</p>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite a team member"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button form="tmf" type="submit" loading={saving}>Send invite</Button></>}>
        <form id="tmf" onSubmit={invite} className="grid gap-3 sm:grid-cols-2">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{error}</div>}
          <Field label="Full name" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {ROLES.filter((r) => r.value !== "owner").map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </Field>
          <Field label="Position"><Input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder="Sales Executive" /></Field>
          <Field label="Department"><Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="Operations" /></Field>
          <div className="sm:col-span-2">
            <Field label="Temporary password" hint="Minimum 8 characters. Share it securely — they can change it later.">
              <Input type="text" value={form.tempPassword} onChange={(e) => setForm((f) => ({ ...f, tempPassword: e.target.value }))} minLength={8} />
            </Field>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
