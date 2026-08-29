<div align="center">

# 🇲🇾 BizFlow MY

### Quotation, Invoice, Task, Booking & Business Management for Malaysian SMEs

**QUOTATIONS · INVOICES · TASKS · BOOKINGS · TEAMS — ALL IN ONE PLACE**

A modern, multi-tenant SaaS platform built for Malaysian freelancers, service providers, startups and small-to-medium businesses. Register, create a quotation, convert it into an invoice, record payment, track expenses, assign tasks, manage bookings, and understand your finances — without accounting or technical knowledge.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [Project Structure](#-project-structure) · [Business Rules](#-business-rules) · [Roadmap](#-roadmap)

</div>

---

## ✨ Overview

BizFlow MY feels like **QuickBooks + an invoice generator + a simple CRM + a task manager + a booking system**, but with a much simpler interface tailored for Malaysian businesses (MYR/RM, Malaysian address & phone formats, configurable SST tax fields).

Everything is **multi-tenant**: each business gets an isolated workspace, and a user from Business A can never access Business B's data. Every important financial action is calculated **server-side** and written to an immutable audit log.

> **Demo credentials** (after seeding)
> - **Business owner:** `demo@bizflowmy.com` / `demo12345`
> - **Platform admin:** `admin@bizflowmy.com` / `admin12345`
> - **Public booking page:** `/book/kreatif-studio`

---

## 🚀 Features

### Core (MVP)
- 🔐 **Auth & multi-tenancy** — email/password registration, scrypt-hashed passwords, server-side revocable sessions, multiple workspaces per user, workspace switcher.
- 🧙 **Business setup wizard** — 10-step guided onboarding with skippable optional fields and a progress checklist.
- 📊 **Dashboard** — revenue, outstanding, overdue, expenses & net profit cards, monthly sales / expense / profit charts, invoice-status donut, quotation conversion, date filtering (today / week / month / quarter / year).
- 👥 **Customers (CRM)** — full contact records, per-customer totals (billed, paid, outstanding, overdue), related tasks/bookings, communication history, CSV export.
- 📦 **Products & Services** — reusable catalog with price, cost, tax, discount, unit and bookable flag.
- 📄 **Quotations** — auto numbering (`QT-2026-0001`), statuses (draft → sent → viewed → accepted/rejected/expired → converted), PDF, email & WhatsApp sharing.
- ⚡ **Quotation → Invoice** — one-click conversion that preserves the original quotation and keeps the relationship.
- 🧾 **Invoices** — auto numbering (`INV-2026-0001`), server-calculated totals, payment terms, bank details, statuses incl. auto-derived **overdue**.
- 💳 **Payments** — full & partial payments, multiple methods (cash, bank transfer, card, online, e-wallet), automatic invoice status updates.
- 📉 **Expenses** — categorised tracking so the dashboard shows true net profit.
- 🖨️ **PDF generation** — print-ready A4 documents in 3 templates (modern / classic / minimal).

### Phase 2
- ✅ **Tasks** — list **and** drag-and-drop Kanban (To Do → In Progress → Review → Completed), priorities, due dates, assignees, customer links.
- 📅 **Calendar** — day / week / month views of all bookings.
- 🗓️ **Bookings** — internal bookings **plus a public booking page** (`/book/:slug`) where customers pick a service, staff, date & time.
- 🧑‍🤝‍🧑 **Team** — invite staff with 6 roles (owner, admin, manager, staff, accountant, sales), per-member performance stats, activity log.
- 🔔 **Notifications** — in-app notifications for invoices, payments, bookings, quotes, tasks, team & subscription events.
- ✉️ **Email & WhatsApp sharing** — auditable outbox + WhatsApp deep links carrying a **secure tokenised document link** instead of sensitive data.

### Phase 3+
- 🌐 **Customer portal** — clients view & accept/decline quotations via secure link (`/d/q/:token`).
- 📈 **Reports** — sales, invoice, expense, profit & loss, customer and product reports with CSV export & PDF print.
- ⏰ **Payment reminders** — overdue sweep that queues reminders and auto-creates follow-up tasks (stages: −3, 0, +3, +7, +14 days).
- 🤖 **Automation** — quote accepted → convert prompt; conversion → follow-up task; payment → status update; booking → notification.
- 💠 **Subscriptions** — Free / Pro (RM29) / Business (RM59) with usage meters and **server-side limit enforcement**.
- 🛠️ **SaaS Admin dashboard** — MRR, users, businesses, plans, suspensions, support tickets, announcements & product analytics.
- 🔎 **Global search** — fast partial-match search across customers, invoices, quotations, products, tasks & bookings.

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router, React 19, Server Components) |
| Language | **TypeScript** |
| Database | **PostgreSQL** |
| ORM | **Drizzle ORM** + drizzle-kit |
| Styling | **Tailwind CSS v4** |
| Validation | **Zod** |
| Auth | Custom scrypt hashing + server-side sessions (HTTP-only cookies) |
| Charts | Hand-built SVG chart components (no heavy deps) |

**Money is stored as integer cents (sen)** and percentages as **basis points** (600 = 6.00%) to avoid floating-point rounding errors.

---

## 🏁 Getting Started

### Prerequisites
- Node.js 20+
- A running PostgreSQL instance

### 1. Clone & install
```bash
git clone https://github.com/your-org/bizflow-my.git
cd bizflow-my
npm install
```

### 2. Configure environment
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
# Optional — used for absolute URLs in SEO metadata, sitemap & robots
NEXT_PUBLIC_SITE_URL="https://bizflowmy.com"
```

### 3. Apply the database schema
```bash
npx drizzle-kit push
```

### 4. Seed demo data (optional but recommended)
```bash
npx tsx scripts/seed.ts
```
This creates a fully-populated Malaysian demo agency ("Kreatif Studio Enterprise"), a platform admin, subscription plans, customers, products, quotations, invoices, payments, expenses, tasks, bookings and more.

### 5. Run
```bash
npm run dev        # development
# or
npm run build && npm run start   # production
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npx drizzle-kit push` | Apply schema changes to the database |
| `npx tsx scripts/seed.ts` | Seed demo data |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (legal)/               # Privacy & Terms pages
│   ├── admin/                 # SaaS administrator dashboard
│   ├── api/                   # RESTful route handlers
│   │   ├── auth/              # register, login, logout
│   │   ├── businesses/        # workspace CRUD + switch
│   │   ├── customers/ products/ quotations/ invoices/
│   │   ├── payments/ expenses/ tasks/ bookings/ team/
│   │   ├── reports/ subscription/ notifications/ search/
│   │   ├── share/ reminders/ documents/ support/
│   │   ├── public/[slug]/     # public booking endpoint
│   │   ├── d/[token]/         # customer portal quote decision
│   │   └── health/            # health check
│   ├── app/                   # Authenticated workspace (dashboard & modules)
│   ├── book/[slug]/           # Public booking page
│   ├── d/[type]/[token]/      # Customer portal document view
│   ├── onboarding/            # Business setup wizard
│   ├── login/ register/       # Auth pages
│   ├── help/ pricing/         # Marketing pages
│   └── page.tsx               # Landing page
├── components/                # Shared UI kit, charts, shell, forms
├── db/
│   ├── schema.ts              # Drizzle schema (26 tables)
│   └── index.ts               # DB client
└── lib/                       # auth, rbac, api helpers, plans,
                               # documents, reports, messaging, format
scripts/
└── seed.ts                    # Demo data seeder
```

---

## 🔌 API Overview

All endpoints return `{ ok: true, data }` on success or `{ ok: false, error: { message, code } }` on failure. Authenticated endpoints are scoped to the caller's active business and gated by role capabilities.

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout` |
| Businesses | `GET/POST/PATCH /api/businesses`, `POST /api/businesses/switch` |
| Customers | `GET/POST /api/customers`, `GET/PATCH/DELETE /api/customers/:id` |
| Products | `GET/POST /api/products`, `PATCH/DELETE /api/products/:id` |
| Quotations | `GET/POST /api/quotations`, `GET/PATCH/DELETE /api/quotations/:id`, `POST /api/quotations/:id/convert` |
| Invoices | `GET/POST /api/invoices`, `GET/PATCH/DELETE /api/invoices/:id` |
| Payments | `GET/POST /api/payments`, `DELETE /api/payments/:id` |
| Expenses | `GET/POST /api/expenses`, `PATCH/DELETE /api/expenses/:id` |
| Tasks | `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id` |
| Bookings | `GET/POST /api/bookings`, `PATCH/DELETE /api/bookings/:id` |
| Team | `GET/POST /api/team`, `PATCH/DELETE /api/team/:id` |
| Reports | `GET /api/reports`, `GET /api/reports/export` |
| Subscription | `GET/POST /api/subscription` |
| Other | `/api/notifications`, `/api/search`, `/api/share`, `/api/reminders`, `/api/documents`, `/api/support`, `/api/admin`, `/api/health` |
| Public | `GET/POST /api/public/:slug`, `POST /api/d/:token` |

---

## 🔒 Security

- **Tenant isolation** — every query scoped by `businessId`; cross-tenant access is impossible.
- **Password hashing** — scrypt with per-user salt; passwords never stored in plain text.
- **Sessions** — server-side, expiring, revocable; HTTP-only, SameSite cookies.
- **RBAC** — 6 roles mapped to a capability matrix enforced on every write.
- **Input validation** — Zod schemas on all request bodies.
- **Rate limiting** — on auth, booking, support and portal endpoints.
- **Safe errors** — internal/database errors are logged, never leaked to clients.
- **Audit trail** — every financial action recorded in `activity_logs`.

---

## 📐 Business Rules

1. Quotations, invoices and customers always belong to a business.
2. Users can only access data for their authorised workspace.
3. **Invoice/quotation totals are calculated server-side** — never trusted from the client.
4. Finalised invoices with recorded payments lock their line items (audit-tracked).
5. **Payments cannot exceed the outstanding balance** unless explicitly allowed.
6. **Overdue status is derived automatically** from due date & balance.
7. **Quotation→invoice conversion preserves the original** and keeps the relationship.
8. Financial documents are **archived, not hard-deleted**.
9. Every important financial action is logged.
10. **Subscription limits are enforced server-side.**

---

## 💰 Subscription Plans

| Plan | Price | Highlights |
|------|-------|-----------|
| **Free** | RM0/mo | 5 invoices & 5 quotations/mo, 20 customers, 1 user |
| **Pro** | RM29/mo | Unlimited invoices/quotes, 500 customers, tasks, bookings, reports, sharing, 3 team members |
| **Business** | RM59/mo | Everything in Pro + unlimited customers/docs, 10+ team, advanced reports, automated reminders, priority support |

Plans are **data-driven** — new tiers can be added from the admin dashboard without a deployment.

---

## ⚠️ Tax & Legal Disclaimer

BizFlow MY provides **fully configurable** tax fields (label, rate, on/off) — nothing is hard-coded. It does **not** provide tax, accounting or legal advice. Verify tax treatment, rates, e-invoicing and compliance against current Malaysian requirements (LHDN, RMCD / SST) before issuing documents. The included Privacy Policy and Terms of Service are configurable templates for your own legal review.

---

## 🗺️ Roadmap

- [ ] Payment gateway integrations (FPX, DuitNow, cards, e-wallets) via the existing abstraction layer
- [ ] Transactional email provider delivery (outbox already implemented)
- [ ] Recurring invoices
- [ ] S3-compatible file uploads for documents & receipts
- [ ] AI business assistant ("show me all overdue invoices")
- [ ] PWA / mobile app
- [ ] Accounting integrations & white-label

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss significant changes first. Before submitting a PR, ensure:

```bash
npm run typecheck && npm run lint && npm run build
```

all pass.

---

## 📄 License

Released under the [MIT License](LICENSE).

---

<div align="center">

**Built for Malaysian freelancers, service providers & SMEs.**
Prices in Malaysian Ringgit (MYR).

</div>
