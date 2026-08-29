import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy", description: "How BizFlow MY handles your business data, privacy controls, data export and account deletion." };

export default function PrivacyPage() {
  return (
    <article>
      <h1 className="text-3xl font-black tracking-tight text-slate-900">Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</p>
      <p>
        This document describes how BizFlow MY handles information. It is provided as a configurable starting point for your review — it is
        <strong> not legal advice</strong> and should be checked by your own advisers against the Personal Data Protection Act 2010 (Malaysia) and any other laws that apply to you.
      </p>

      <h2>Information we process</h2>
      <ul>
        <li>Account data: name, email, phone number and hashed password.</li>
        <li>Business data: business profile, customers, products, quotations, invoices, payments, expenses, tasks, bookings and documents you create.</li>
        <li>Technical data: session records, activity logs and product analytics events.</li>
      </ul>

      <h2>How data is isolated</h2>
      <p>
        BizFlow MY is multi-tenant. Every record is bound to a business workspace and every API request is scoped to the workspace of the signed-in user.
        A member of Business A cannot read or write data belonging to Business B.
      </p>

      <h2>Security</h2>
      <ul>
        <li>Passwords are hashed with scrypt and never stored in plain text.</li>
        <li>Sessions are stored server-side, expire automatically and can be revoked.</li>
        <li>Role-based access control restricts what each team member can see and do.</li>
        <li>All financial actions are written to an immutable activity log.</li>
        <li>Input is validated on the server and rate limiting protects sensitive endpoints.</li>
      </ul>

      <h2>Your controls</h2>
      <ul>
        <li><strong>Export my data</strong> — download customers, invoices, quotations, payments and expenses as CSV from Settings → Data &amp; privacy.</li>
        <li><strong>Account deletion</strong> — request deletion of your user account and its workspaces via the Help Center.</li>
        <li><strong>Business data deletion</strong> — archive or delete individual records; financial documents are archived rather than hard-deleted to preserve the audit trail.</li>
      </ul>

      <h2>Cookies</h2>
      <p>BizFlow MY sets a single essential, HTTP-only session cookie. No advertising or third-party tracking cookies are used.</p>

      <h2>Contact</h2>
      <p>Questions about privacy? Submit a ticket from the Help Center and we will respond.</p>
    </article>
  );
}
