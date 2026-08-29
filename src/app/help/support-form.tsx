"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, apiRequest } from "@/components/ui";

export default function SupportForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("/api/support", { method: "POST", body: JSON.stringify(form) });
      setState("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unable to submit your ticket.");
    } finally {
      setLoading(false);
    }
  }

  if (state === "sent") {
    return <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">✓ Ticket submitted. We will reply to your email shortly.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">{error}</p>}
      <Field label="Your name" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></Field>
      <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></Field>
      <div className="sm:col-span-2"><Field label="Subject" required><Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} required /></Field></div>
      <div className="sm:col-span-2"><Field label="How can we help?" required><Textarea rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required /></Field></div>
      <div className="sm:col-span-2"><Button type="submit" loading={loading}>Submit ticket</Button></div>
    </form>
  );
}
