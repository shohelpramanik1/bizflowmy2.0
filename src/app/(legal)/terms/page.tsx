import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service", description: "The terms that apply when you use BizFlow MY invoice and business management software." };

export default function TermsPage() {
  return (
    <article>
      <h1 className="text-3xl font-black tracking-tight text-slate-900">Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}</p>
      <p>These terms are a configurable template for review by your legal advisers. They do not constitute legal advice.</p>

      <h2>1. Your account</h2>
      <p>You are responsible for keeping your credentials secure and for all activity in your workspaces. You must be authorised to act for the business you register.</p>

      <h2>2. Subscription and billing</h2>
      <p>
        Plans are billed monthly in Malaysian Ringgit: Free (RM0), Pro (RM29) and Business (RM59). Plan limits are enforced by the service.
        You may upgrade, downgrade or cancel at any time; cancellation takes effect at the end of the current period.
      </p>

      <h2>3. Acceptable use</h2>
      <ul>
        <li>Do not use the service for unlawful invoicing, fraud or misrepresentation.</li>
        <li>Do not attempt to access another business workspace or bypass access controls.</li>
        <li>Do not abuse messaging features to send unsolicited communications.</li>
      </ul>

      <h2>4. Your data</h2>
      <p>You own the business data you enter. We process it to provide the service. You can export it at any time from Settings.</p>

      <h2>5. Tax and accounting</h2>
      <p>
        BizFlow MY provides configurable tax fields and calculations but does not provide tax, accounting or legal advice. You are responsible for verifying
        tax treatment, rates, e-invoicing requirements and compliance against current Malaysian requirements (including LHDN and RMCD guidance).
      </p>

      <h2>6. Availability</h2>
      <p>We aim for high availability but the service is provided &ldquo;as is&rdquo; without warranty. Scheduled maintenance may occur.</p>

      <h2>7. Limitation of liability</h2>
      <p>To the maximum extent permitted by law, our aggregate liability is limited to the subscription fees you paid in the preceding twelve months.</p>

      <h2>8. Changes</h2>
      <p>We may update these terms. Material changes will be announced in the application.</p>
    </article>
  );
}
