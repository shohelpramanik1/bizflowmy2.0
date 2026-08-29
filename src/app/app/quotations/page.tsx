import Link from "next/link";
import { getSession } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import DocumentList from "@/components/document-list";

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const session = await getSession();
  const symbol = session?.business?.currencySymbol ?? "RM";
  return (
    <div>
      <PageHeader
        title="Quotations"
        subtitle="Auto-numbered quotes you can convert into invoices with one click."
        action={
          <Link href="/app/quotations/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
            + New quotation
          </Link>
        }
      />
      <DocumentList kind="quotation" symbol={symbol} />
    </div>
  );
}
