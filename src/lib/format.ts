export function formatMoney(cents: number, symbol = "RM"): string {
  const value = (cents ?? 0) / 100;
  return `${symbol} ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompact(cents: number, symbol = "RM"): string {
  const v = (cents ?? 0) / 100;
  if (Math.abs(v) >= 1_000_000) return `${symbol} ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 10_000) return `${symbol} ${(v / 1000).toFixed(1)}k`;
  return formatMoney(cents, symbol);
}

export function toCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const n = typeof input === "number" ? input : Number(String(input).replace(/[^0-9.\-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): string {
  return ((cents ?? 0) / 100).toFixed(2);
}

export function bpToPct(bp: number): string {
  return ((bp ?? 0) / 100).toFixed(2);
}

export function pctToBp(pct: string | number | null | undefined): number {
  if (pct === null || pct === undefined || pct === "") return 0;
  const n = typeof pct === "number" ? pct : Number(String(pct).replace(/[^0-9.\-]/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(`${iso.slice(0, 10)}T00:00:00Z`) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${to.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 864e5);
}

export function normalizeMsisdn(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.startsWith("60")) return digits;
  if (digits.startsWith("0")) return `6${digits}`;
  return digits;
}

export const MY_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
  "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu",
  "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
];

export const BUSINESS_TYPES = [
  "Freelancer / Solo", "Digital Agency", "Web / Software Development", "Design Studio",
  "Photography & Video", "Marketing Agency", "Contractor / Renovation", "Cleaning Services",
  "Repair & Maintenance", "Printing", "Event Management", "Travel Agency", "Beauty & Salon",
  "Clinic / Healthcare", "Automotive Services", "Training Centre", "Consultancy", "Retail / Trading", "Other",
];

export const EXPENSE_CATEGORIES = [
  "Office", "Marketing", "Software", "Transportation", "Salary", "Rent",
  "Utilities", "Equipment", "Travel", "Other",
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Credit/Debit Card" },
  { value: "online", label: "Online Payment" },
  { value: "ewallet", label: "E-wallet" },
  { value: "other", label: "Other" },
];
