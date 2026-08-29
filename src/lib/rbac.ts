import type { Role } from "./auth";

export const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "owner", label: "Owner", description: "Full access to everything including billing." },
  { value: "admin", label: "Admin", description: "Almost full access, cannot delete the business." },
  { value: "manager", label: "Manager", description: "Operations, customers, tasks and bookings." },
  { value: "staff", label: "Staff", description: "Limited access to assigned tasks and bookings." },
  { value: "accountant", label: "Accountant", description: "Financial data: invoices, payments, expenses, reports." },
  { value: "sales", label: "Sales", description: "Customers, quotations and invoices." },
];

export type Capability =
  | "customers.read"
  | "customers.write"
  | "products.read"
  | "products.write"
  | "quotations.read"
  | "quotations.write"
  | "invoices.read"
  | "invoices.write"
  | "payments.read"
  | "payments.write"
  | "expenses.read"
  | "expenses.write"
  | "tasks.read"
  | "tasks.write"
  | "bookings.read"
  | "bookings.write"
  | "team.read"
  | "team.write"
  | "reports.read"
  | "documents.read"
  | "documents.write"
  | "settings.write"
  | "billing.write";

const ALL: Capability[] = [
  "customers.read", "customers.write", "products.read", "products.write",
  "quotations.read", "quotations.write", "invoices.read", "invoices.write",
  "payments.read", "payments.write", "expenses.read", "expenses.write",
  "tasks.read", "tasks.write", "bookings.read", "bookings.write",
  "team.read", "team.write", "reports.read", "documents.read", "documents.write",
  "settings.write", "billing.write",
];

const MATRIX: Record<Role, Capability[]> = {
  owner: ALL,
  admin: ALL.filter((c) => c !== "billing.write"),
  manager: [
    "customers.read", "customers.write", "products.read", "products.write",
    "quotations.read", "quotations.write", "invoices.read", "invoices.write",
    "payments.read", "payments.write", "expenses.read",
    "tasks.read", "tasks.write", "bookings.read", "bookings.write",
    "team.read", "reports.read", "documents.read", "documents.write",
  ],
  staff: ["customers.read", "products.read", "tasks.read", "tasks.write", "bookings.read", "bookings.write", "documents.read"],
  accountant: [
    "customers.read", "products.read", "quotations.read",
    "invoices.read", "invoices.write", "payments.read", "payments.write",
    "expenses.read", "expenses.write", "reports.read", "documents.read", "documents.write",
  ],
  sales: [
    "customers.read", "customers.write", "products.read",
    "quotations.read", "quotations.write", "invoices.read", "invoices.write",
    "tasks.read", "tasks.write", "bookings.read", "bookings.write", "documents.read",
  ],
};

export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: Role): Capability[] {
  return MATRIX[role] ?? [];
}
