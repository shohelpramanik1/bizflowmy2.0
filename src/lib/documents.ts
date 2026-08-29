import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices, payments, quotationItems, quotations } from "@/db/schema";
import { AppError } from "./api";
import { deriveInvoiceStatus } from "./status";

export type LineInput = {
  productId?: number | null;
  name: string;
  description?: string | null;
  quantity: number;
  unitPriceCents: number;
  discountBp: number;
  taxRateBp: number;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  lines: (LineInput & { lineTotalCents: number })[];
};

/** Business rule #5 — all document totals are computed server side. */
export function computeTotals(lines: LineInput[]): Totals {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  const out: (LineInput & { lineTotalCents: number })[] = [];

  for (const raw of lines) {
    const qty = Math.max(0, Math.round(Number(raw.quantity) || 0));
    const unit = Math.max(0, Math.round(Number(raw.unitPriceCents) || 0));
    const discBp = Math.min(10000, Math.max(0, Math.round(Number(raw.discountBp) || 0)));
    const taxBp = Math.min(10000, Math.max(0, Math.round(Number(raw.taxRateBp) || 0)));

    const gross = qty * unit;
    const lineDiscount = Math.round((gross * discBp) / 10000);
    const net = gross - lineDiscount;
    const lineTax = Math.round((net * taxBp) / 10000);

    subtotal += gross;
    discount += lineDiscount;
    tax += lineTax;
    out.push({
      productId: raw.productId ?? null,
      name: raw.name,
      description: raw.description ?? null,
      quantity: qty,
      unitPriceCents: unit,
      discountBp: discBp,
      taxRateBp: taxBp,
      lineTotalCents: net + lineTax,
    });
  }

  return {
    subtotalCents: subtotal,
    discountCents: discount,
    taxCents: tax,
    totalCents: subtotal - discount + tax,
    lines: out,
  };
}

async function nextSequence(businessId: number, kind: "quotation" | "invoice", year: number) {
  const prefix = kind === "quotation" ? "QT" : "INV";
  const table = kind === "quotation" ? quotations : invoices;
  const rows = await db
    .select({ number: table.number })
    .from(table)
    .where(and(eq(table.businessId, businessId), sql`${table.number} LIKE ${`${prefix}-${year}-%`}`))
    .orderBy(desc(table.number))
    .limit(1);
  const last = rows[0]?.number;
  const n = last ? Number(last.split("-").pop()) || 0 : 0;
  return `${prefix}-${year}-${String(n + 1).padStart(4, "0")}`;
}

export async function nextQuotationNumber(businessId: number) {
  return nextSequence(businessId, "quotation", new Date().getFullYear());
}

export async function nextInvoiceNumber(businessId: number) {
  return nextSequence(businessId, "invoice", new Date().getFullYear());
}

export { QUOTATION_STATUSES, INVOICE_STATUSES, statusLabel, statusTone, deriveInvoiceStatus } from "./status";

export async function recalcInvoicePaid(invoiceId: number) {
  const [row] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!row) throw new AppError("Invoice not found.", 404, "not_found");
  const [agg] = await db
    .select({ total: sql<number>`COALESCE(SUM(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  const paid = agg?.total ?? 0;
  const status = deriveInvoiceStatus(row.status, row.totalCents, paid, row.dueDate);
  await db.update(invoices).set({ paidCents: paid, status, updatedAt: new Date() }).where(eq(invoices.id, invoiceId));
  return { paid, status, invoice: row };
}

export async function loadQuotationWithItems(businessId: number, id: number) {
  const [quotation] = await db
    .select()
    .from(quotations)
    .where(and(eq(quotations.id, id), eq(quotations.businessId, businessId)))
    .limit(1);
  if (!quotation) throw new AppError("Quotation not found.", 404, "not_found");
  const items = await db
    .select()
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, id))
    .orderBy(quotationItems.sortOrder);
  return { quotation, items };
}

export async function loadInvoiceWithItems(businessId: number, id: number) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.businessId, businessId)))
    .limit(1);
  if (!invoice) throw new AppError("Invoice not found.", 404, "not_found");
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder);
  return { invoice, items };
}
