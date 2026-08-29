import Link from "next/link";
import type { Metadata } from "next";
import SupportForm from "./support-form";

export const metadata: Metadata = {
  title: "Help Center — BizFlow MY",
  description: "Guides for quotations, invoices, payments, customers, tasks, bookings, team and subscription in BizFlow MY.",
};

const SECTIONS = [
  { title: "Getting Started", items: ["Create your account and business workspace", "Complete the 10-step business setup wizard", "Understand the setup progress checklist", "Switch between multiple workspaces"] },
  { title: "Quotations", items: ["Create a quotation with auto numbering (QT-2026-0001)", "Add line items with discount and tax", "Send by email or WhatsApp", "Convert an accepted quotation into an invoice"] },
  { title: "Invoices", items: ["Create an invoice and set payment terms", "Understand statuses: draft, sent, viewed, partially paid, paid, overdue", "Lock and audit finalised invoices", "Download a print-ready PDF"] },
  { title: "Payments", items: ["Record a full or partial payment", "Payment methods: cash, bank transfer, card, online, e-wallet", "Automatic status updates", "Delete a payment and recalculate the balance"] },
  { title: "Customers", items: ["Add customers with Malaysian address fields", "See total billed, paid, outstanding and overdue", "Link tasks and bookings to a customer", "Export your customer list to CSV"] },
  { title: "Tasks", items: ["List view and Kanban board", "Drag and drop between To Do → In Progress → Review → Completed", "Assign tasks to team members", "Automatic follow-up tasks for overdue invoices"] },
  { title: "Bookings", items: ["Create internal bookings", "Share your public booking page", "Day, week and month calendar views", "Confirm, complete or mark a no-show"] },
  { title: "Team", items: ["Invite staff with a role", "Roles: owner, admin, manager, staff, accountant, sales", "Review the team activity log", "Remove access safely"] },
  { title: "Reports", items: ["Sales, invoice, expense and profit & loss reports", "Top customers and best-selling services", "Filter by day, week, month, quarter or year", "Export to CSV or print to PDF"] },
  { title: "Subscription", items: ["Free, Pro (RM29) and Business (RM59) plans", "Usage meters and server-side limits", "Upgrade, downgrade or cancel anytime", "Export your data before cancelling"] },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">B</span>
            <span className="text-lg font-extrabold text-slate-900">BizFlow<span className="text-brand-600">MY</span></span>
          </Link>
          <Link href="/register" className="ml-auto rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Start for free</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Help Center</h1>
        <p className="mt-2 text-slate-600">Everything you need to run BizFlow MY confidently.</p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <section key={s.title} className="rounded-2xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-900">{s.title}</h2>
              <ul className="mt-3 space-y-1.5">
                {s.items.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-600"><span className="text-brand-500">›</span>{i}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section id="contact" className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <h2 className="text-xl font-black text-slate-900">Contact support</h2>
          <p className="mt-1 text-sm text-slate-600">Submit a ticket and our team will get back to you. Business plan customers get priority support.</p>
          <SupportForm />
        </section>
      </main>
    </div>
  );
}
