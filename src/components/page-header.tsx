import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "brand",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "amber" | "rose" | "emerald" | "slate" | "violet";
  icon?: ReactNode;
}) {
  const tones: Record<string, string> = {
    brand: "from-brand-600 to-brand-500 text-white",
    amber: "from-amber-500 to-amber-400 text-white",
    rose: "from-rose-600 to-rose-500 text-white",
    emerald: "from-emerald-600 to-emerald-500 text-white",
    violet: "from-violet-600 to-violet-500 text-white",
    slate: "from-slate-700 to-slate-600 text-white",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] opacity-80">{label}</p>
        {icon && <span className="opacity-70">{icon}</span>}
      </div>
      <p className="mt-2 text-xl font-black leading-tight sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-[11px] opacity-80">{hint}</p>}
      <div className="pointer-events-none absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/10" />
    </div>
  );
}
