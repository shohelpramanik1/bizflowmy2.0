import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * BizFlow MY — multi-tenant schema.
 * MONEY CONVENTION: every monetary column is stored as an INTEGER number of
 * cents (sen). Percentage columns are stored as basis points (600 = 6.00%).
 */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    phone: text("phone"),
    avatarUrl: text("avatar_url"),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    status: text("status").notNull().default("active"), // active | suspended
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const businesses = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    businessType: text("business_type").default("Services"),
    registrationNo: text("registration_no"),
    logoUrl: text("logo_url"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postcode: text("postcode"),
    country: text("country").notNull().default("Malaysia"),
    currency: text("currency").notNull().default("MYR"),
    currencySymbol: text("currency_symbol").notNull().default("RM"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    defaultPaymentTerms: text("default_payment_terms").default("Payment due within 30 days"),
    paymentTermDays: integer("payment_term_days").notNull().default(30),
    quotationTemplate: text("quotation_template").notNull().default("modern"),
    invoiceTemplate: text("invoice_template").notNull().default("modern"),
    taxEnabled: boolean("tax_enabled").notNull().default(false),
    taxLabel: text("tax_label").notNull().default("SST"),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    bankInfo: text("bank_info"),
    quotationTerms: text("quotation_terms"),
    invoiceNotes: text("invoice_notes"),
    paymentGateway: text("payment_gateway").default("none"), // none | fpx | duitnow | card | ewallet
    gatewayConfig: jsonb("gateway_config").$type<Record<string, string>>(),
    reminderSettings: jsonb("reminder_settings").$type<{ stages: number[]; auto: boolean }>(),
    bookingEnabled: boolean("booking_enabled").notNull().default(true),
    status: text("status").notNull().default("active"), // active | suspended
    setupCompleted: boolean("setup_completed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("businesses_slug_idx").on(t.slug), index("businesses_owner_idx").on(t.ownerId)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    userId: integer("user_id"),
    inviteEmail: text("invite_email"),
    name: text("name"),
    phone: text("phone"),
    role: text("role").notNull().default("staff"), // owner|admin|manager|staff|accountant|sales
    position: text("position"),
    department: text("department"),
    status: text("status").notNull().default("active"), // active | invited | disabled
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("memberships_business_idx").on(t.businessId),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id").notNull(),
    activeBusinessId: integer("active_business_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull().default(0),
    interval: text("interval").notNull().default("month"),
    tagline: text("tagline"),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    limits: jsonb("limits")
      .$type<{ invoices: number; quotations: number; customers: number; team: number }>()
      .notNull()
      .default({ invoices: -1, quotations: -1, customers: -1, team: -1 }),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("plans_code_idx").on(t.code)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    planCode: text("plan_code").notNull().default("free"),
    status: text("status").notNull().default("active"), // active | cancelled | past_due
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    renewsAt: timestamp("renews_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [index("subs_business_idx").on(t.businessId)],
);

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    name: text("name").notNull(),
    companyName: text("company_name"),
    email: text("email"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    postcode: text("postcode"),
    country: text("country").default("Malaysia"),
    taxNo: text("tax_no"),
    notes: text("notes"),
    portalToken: text("portal_token"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_business_idx").on(t.businessId), index("customers_name_idx").on(t.name)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    name: text("name").notNull(),
    sku: text("sku"),
    description: text("description"),
    category: text("category"),
    unit: text("unit").default("unit"),
    kind: text("kind").notNull().default("service"), // service | product
    priceCents: integer("price_cents").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    discountBp: integer("discount_bp").notNull().default(0),
    durationMinutes: integer("duration_minutes").default(60),
    bookable: boolean("bookable").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("products_business_idx").on(t.businessId)],
);

export const quotations = pgTable(
  "quotations",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    customerId: integer("customer_id").notNull(),
    number: text("number").notNull(),
    issueDate: date("issue_date").notNull(),
    expiryDate: date("expiry_date"),
    status: text("status").notNull().default("draft"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    notes: text("notes"),
    terms: text("terms"),
    convertedInvoiceId: integer("converted_invoice_id"),
    publicToken: text("public_token"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    createdBy: integer("created_by"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("quotations_business_idx").on(t.businessId),
    uniqueIndex("quotations_number_idx").on(t.businessId, t.number),
  ],
);

export const quotationItems = pgTable(
  "quotation_items",
  {
    id: serial("id").primaryKey(),
    quotationId: integer("quotation_id").notNull(),
    productId: integer("product_id"),
    name: text("name").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    discountBp: integer("discount_bp").notNull().default(0),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("quotation_items_q_idx").on(t.quotationId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    customerId: integer("customer_id").notNull(),
    quotationId: integer("quotation_id"),
    number: text("number").notNull(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),
    status: text("status").notNull().default("draft"),
    subtotalCents: integer("subtotal_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull().default(0),
    paidCents: integer("paid_cents").notNull().default(0),
    paymentTerms: text("payment_terms"),
    notes: text("notes"),
    bankInfo: text("bank_info"),
    publicToken: text("public_token"),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    createdBy: integer("created_by"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("invoices_business_idx").on(t.businessId),
    uniqueIndex("invoices_number_idx").on(t.businessId, t.number),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: serial("id").primaryKey(),
    invoiceId: integer("invoice_id").notNull(),
    productId: integer("product_id"),
    name: text("name").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    unitPriceCents: integer("unit_price_cents").notNull().default(0),
    discountBp: integer("discount_bp").notNull().default(0),
    taxRateBp: integer("tax_rate_bp").notNull().default(0),
    lineTotalCents: integer("line_total_cents").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("invoice_items_i_idx").on(t.invoiceId)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    invoiceId: integer("invoice_id").notNull(),
    customerId: integer("customer_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    paidAt: date("paid_at").notNull(),
    method: text("method").notNull().default("bank_transfer"),
    reference: text("reference"),
    notes: text("notes"),
    gateway: text("gateway"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_business_idx").on(t.businessId), index("payments_invoice_idx").on(t.invoiceId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default("Other"),
    supplier: text("supplier"),
    amountCents: integer("amount_cents").notNull().default(0),
    taxCents: integer("tax_cents").notNull().default(0),
    expenseDate: date("expense_date").notNull(),
    method: text("method").default("bank_transfer"),
    receiptUrl: text("receipt_url"),
    notes: text("notes"),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("expenses_business_idx").on(t.businessId)],
);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    customerId: integer("customer_id"),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("projects_business_idx").on(t.businessId)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    customerId: integer("customer_id"),
    projectId: integer("project_id"),
    assigneeId: integer("assignee_id"),
    priority: text("priority").notNull().default("medium"),
    status: text("status").notNull().default("todo"), // todo|in_progress|review|waiting|completed|cancelled
    startDate: date("start_date"),
    dueDate: date("due_date"),
    estimatedHours: integer("estimated_hours"),
    actualHours: integer("actual_hours"),
    notes: text("notes"),
    position: integer("position").notNull().default(0),
    createdBy: integer("created_by"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_business_idx").on(t.businessId), index("tasks_assignee_idx").on(t.assigneeId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    customerId: integer("customer_id"),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    customerEmail: text("customer_email"),
    productId: integer("product_id"),
    serviceName: text("service_name"),
    staffMembershipId: integer("staff_membership_id"),
    bookingDate: date("booking_date").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    location: text("location"),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    source: text("source").notNull().default("internal"), // internal | public
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("bookings_business_idx").on(t.businessId), index("bookings_date_idx").on(t.bookingDate)],
);

export const documents = pgTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    customerId: integer("customer_id"),
    projectId: integer("project_id"),
    name: text("name").notNull(),
    type: text("type").notNull().default("other"),
    url: text("url"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    notes: text("notes"),
    uploadedBy: integer("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_business_idx").on(t.businessId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    userId: integer("user_id"),
    type: text("type").notNull().default("info"),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_business_idx").on(t.businessId)],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    userId: integer("user_id"),
    userName: text("user_name"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_business_idx").on(t.businessId)],
);

export const emailLogs = pgTable(
  "email_logs",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id").notNull(),
    customerId: integer("customer_id"),
    template: text("template").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    body: text("body"),
    channel: text("channel").notNull().default("email"), // email | whatsapp
    status: text("status").notNull().default("queued"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_logs_business_idx").on(t.businessId)],
);

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id"),
  userId: integer("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("all"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id"),
    userId: integer("user_id"),
    event: text("event").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analytics_event_idx").on(t.event)],
);

export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
