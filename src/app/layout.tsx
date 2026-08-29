import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bizflowmy.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BizFlow MY — Invoice, Quotation & Business Management Software Malaysia",
    template: "%s | BizFlow MY",
  },
  description:
    "BizFlow MY is invoice and quotation software for Malaysian freelancers, service providers and SMEs. Create quotations, send invoices in MYR, track payments, manage customers, tasks, bookings and your team — all in one place.",
  keywords: [
    "invoice software Malaysia",
    "quotation software Malaysia",
    "invoice generator Malaysia",
    "quotation generator Malaysia",
    "accounting software for small business",
    "invoice management software",
    "freelancer invoice software",
    "SME business software Malaysia",
    "sistem invois Malaysia",
  ],
  authors: [{ name: "BizFlow MY" }],
  openGraph: {
    type: "website",
    locale: "en_MY",
    url: siteUrl,
    siteName: "BizFlow MY",
    title: "BizFlow MY — Quotations. Invoices. Tasks. Bookings. Teams.",
    description:
      "Run your business without the admin headache. Quotations, invoices, payments, customers, expenses, tasks, bookings and team management for Malaysian SMEs.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BizFlow MY — Business management for Malaysian SMEs",
    description: "Create quotations, send invoices, track payments and manage your team from one simple platform.",
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl },
};

export const viewport: Viewport = {
  themeColor: "#1f3fe4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-MY">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
