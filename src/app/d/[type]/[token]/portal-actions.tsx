"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, apiRequest } from "@/components/ui";

export default function PortalActions({ token, kind, decided, status }: { token: string; kind: "quotation" | "invoice"; decided: boolean; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function decide(action: "accept" | "reject") {
    setBusy(action);
    try {
      await apiRequest(`/api/d/${token}`, { method: "POST", body: JSON.stringify({ action }) });
      setMessage(action === "accept" ? "Thank you — your acceptance has been recorded." : "Your response has been recorded.");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Customer portal</p>
          <p className="text-xs text-slate-500">
            {kind === "quotation"
              ? decided ? `This quotation is ${status}.` : "Review the quotation below and let us know your decision."
              : `Invoice status: ${status.replace("_", " ")}. Payment instructions are shown at the bottom of the document.`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>🖨️ Download PDF</Button>
        {kind === "quotation" && !decided && (
          <>
            <Button size="sm" variant="success" loading={busy === "accept"} onClick={() => decide("accept")}>✓ Accept quotation</Button>
            <Button size="sm" variant="secondary" loading={busy === "reject"} onClick={() => decide("reject")}>Decline</Button>
          </>
        )}
      </div>
      {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">{message}</p>}
    </div>
  );
}
