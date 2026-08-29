export const QUOTATION_STATUSES = ["draft", "sent", "viewed", "accepted", "rejected", "expired", "converted"] as const;
export const INVOICE_STATUSES = ["draft", "sent", "viewed", "partially_paid", "paid", "overdue", "cancelled"] as const;

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function statusTone(status: string): string {
  switch (status) {
    case "paid":
    case "accepted":
    case "completed":
    case "confirmed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "overdue":
    case "rejected":
    case "cancelled":
    case "no_show":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    case "partially_paid":
    case "sent":
    case "pending":
    case "in_progress":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    case "viewed":
    case "converted":
    case "review":
      return "bg-indigo-50 text-indigo-700 ring-indigo-600/20";
    case "expired":
      return "bg-orange-50 text-orange-700 ring-orange-600/20";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
}

/** Business rule #8 — overdue status is derived, never manually set. */
export function deriveInvoiceStatus(current: string, totalCents: number, paidCents: number, dueDate: string): string {
  if (current === "cancelled" || current === "draft") return current;
  if (paidCents >= totalCents && totalCents > 0) return "paid";
  const overdue = new Date(`${dueDate}T23:59:59Z`).getTime() < Date.now();
  if (paidCents > 0) return overdue ? "overdue" : "partially_paid";
  if (overdue) return "overdue";
  return current === "viewed" ? "viewed" : current === "sent" ? "sent" : current;
}
