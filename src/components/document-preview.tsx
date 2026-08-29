import { formatDate, formatMoney } from "@/lib/format";

export type PreviewBusiness = {
  name: string;
  logoUrl: string | null;
  registrationNo: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  currencySymbol: string;
  taxLabel: string;
};

export type PreviewCustomer = {
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  taxNo: string | null;
};

export type PreviewItem = {
  id: number;
  name: string;
  description: string | null;
  quantity: number;
  unitPriceCents: number;
  discountBp: number;
  taxRateBp: number;
  lineTotalCents: number;
};

export default function DocumentPreview({
  title,
  template = "modern",
  business,
  customer,
  number,
  primaryDate,
  primaryDateLabel,
  secondaryDate,
  secondaryDateLabel,
  items,
  subtotalCents,
  discountCents,
  taxCents,
  totalCents,
  paidCents,
  notes,
  terms,
  bankInfo,
  status,
}: {
  title: string;
  template?: string;
  business: PreviewBusiness;
  customer: PreviewCustomer | null;
  number: string;
  primaryDate: string;
  primaryDateLabel: string;
  secondaryDate: string | null;
  secondaryDateLabel: string;
  items: PreviewItem[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  paidCents?: number;
  notes?: string | null;
  terms?: string | null;
  bankInfo?: string | null;
  status?: string;
}) {
  const sym = business.currencySymbol;
  const accent = template === "classic" ? "bg-slate-900" : template === "minimal" ? "bg-white" : "bg-brand-600";
  const accentText = template === "minimal" ? "text-slate-900" : "text-white";
  const address = [business.address, [business.postcode, business.city].filter(Boolean).join(" "), business.state, business.country].filter(Boolean).join(", ");
  const custAddress = customer
    ? [customer.address, [customer.postcode, customer.city].filter(Boolean).join(" "), customer.state, customer.country].filter(Boolean).join(", ")
    : "";

  return (
    <div className="print-full mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`${accent} ${accentText} px-6 py-6 ${template === "minimal" ? "border-b-4 border-slate-900" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt={business.name} className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
            ) : (
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${template === "minimal" ? "bg-slate-900 text-white" : "bg-white/20"} text-lg font-black`}>
                {business.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-black leading-tight">{business.name}</p>
              {business.registrationNo && <p className="text-xs opacity-80">Reg. No: {business.registrationNo}</p>}
              {address && <p className="mt-1 max-w-xs text-xs leading-relaxed opacity-80">{address}</p>}
              <p className="mt-1 text-xs opacity-80">
                {[business.phone, business.email, business.website].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black uppercase tracking-tight">{title}</p>
            <p className="mt-1 text-sm font-bold">{number}</p>
            {status && <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">{status.replace("_", " ")}</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bill to</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{customer?.name ?? "—"}</p>
          {customer?.companyName && <p className="text-sm text-slate-600">{customer.companyName}</p>}
          {custAddress && <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">{custAddress}</p>}
          <p className="mt-1 text-xs text-slate-500">{[customer?.phone, customer?.email].filter(Boolean).join(" · ")}</p>
          {customer?.taxNo && <p className="mt-1 text-xs text-slate-500">Tax/Reg No: {customer.taxNo}</p>}
        </div>
        <div className="sm:text-right">
          <div className="inline-block space-y-1 text-xs">
            <p><span className="font-semibold uppercase tracking-wide text-slate-400">{primaryDateLabel}: </span><span className="font-semibold text-slate-800">{formatDate(primaryDate)}</span></p>
            {secondaryDate && (
              <p><span className="font-semibold uppercase tracking-wide text-slate-400">{secondaryDateLabel}: </span><span className="font-semibold text-slate-800">{formatDate(secondaryDate)}</span></p>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto px-6">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-y border-slate-200 bg-slate-50">
              <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Description</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Qty</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Unit price</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Disc</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">{business.taxLabel}</th>
              <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800">{it.name}</p>
                  {it.description && <p className="text-xs text-slate-500">{it.description}</p>}
                </td>
                <td className="px-3 py-2.5 text-right text-slate-600">{it.quantity}</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{formatMoney(it.unitPriceCents, sym)}</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{(it.discountBp / 100).toFixed(0)}%</td>
                <td className="px-3 py-2.5 text-right text-slate-600">{(it.taxRateBp / 100).toFixed(0)}%</td>
                <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{formatMoney(it.lineTotalCents, sym)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end px-6 py-4">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="font-medium text-slate-800">{formatMoney(subtotalCents, sym)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="font-medium text-rose-600">− {formatMoney(discountCents, sym)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">{business.taxLabel}</dt><dd className="font-medium text-slate-800">{formatMoney(taxCents, sym)}</dd></div>
          <div className="flex justify-between border-t-2 border-slate-900 pt-2 text-base"><dt className="font-black text-slate-900">Grand total</dt><dd className="font-black text-slate-900">{formatMoney(totalCents, sym)}</dd></div>
          {paidCents !== undefined && (
            <>
              <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-medium text-emerald-600">{formatMoney(paidCents, sym)}</dd></div>
              <div className="flex justify-between rounded-lg bg-amber-50 px-2 py-1.5"><dt className="font-bold text-amber-800">Balance due</dt><dd className="font-black text-amber-800">{formatMoney(totalCents - paidCents, sym)}</dd></div>
            </>
          )}
        </dl>
      </div>

      {(bankInfo || notes || terms) && (
        <div className="grid gap-4 border-t border-slate-100 px-6 py-5 sm:grid-cols-2">
          {bankInfo && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Payment instructions</p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">{bankInfo}</p>
            </div>
          )}
          {notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">{notes}</p>
            </div>
          )}
          {terms && (
            <div className="sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Terms &amp; conditions</p>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-600">{terms}</p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center text-[10px] text-slate-400">
        {business.name} · Generated with BizFlow MY · Tax treatment should be verified against current Malaysian requirements.
      </div>
    </div>
  );
}
