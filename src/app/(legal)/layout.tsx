import Link from "next/link";
import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">B</span>
            <span className="text-lg font-extrabold text-slate-900">BizFlow<span className="text-brand-600">MY</span></span>
          </Link>
          <Link href="/help" className="ml-auto text-sm font-semibold text-brand-700 hover:underline">Help Center</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:mt-1 [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-slate-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-sm [&_ul]:text-slate-600">
        {children}
      </main>
    </div>
  );
}
