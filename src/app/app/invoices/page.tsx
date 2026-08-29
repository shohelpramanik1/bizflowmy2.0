import Link from "next/link";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import DocumentList from "@/components/document-list";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await getSession();
  const symbol = session?.business?.currencySymbol ?? "RM";
  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Track what you have billed, what is paid and what is overdue."
        action={
          <Link href="/app/invoices/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
            + New invoice
          </Link>
        }
      />
      <DocumentList kind="invoice" symbol={symbol} />
    </div>
  );
}
