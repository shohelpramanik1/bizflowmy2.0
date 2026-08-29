import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.user.isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <p className="text-3xl">🔒</p>
          <h1 className="mt-3 text-lg font-bold text-slate-900">Administrator access required</h1>
          <p className="mt-1 text-sm text-slate-500">Your account does not have platform administrator permissions.</p>
          <Link href="/app" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Back to workspace</Link>
        </div>
      </div>
    );
  }
  return <AdminClient userName={session.user.name} />;
}
