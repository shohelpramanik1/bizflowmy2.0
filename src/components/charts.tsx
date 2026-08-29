"use client";

import { useId } from "react";

export type Point = { label: string; value: number };

function niceMax(values: number[]) {
  const max = Math.max(1, ...values);
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / pow) * pow;
}

export function BarChart({ data, color = "#345ef6", height = 200, format }: { data: Point[]; color?: string; height?: number; format?: (v: number) => string }) {
  const max = niceMax(data.map((d) => d.value));
  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5 sm:gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group flex flex-1 flex-col items-center justify-end gap-1">
            <span className="pointer-events-none rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
              {format ? format(d.value) : d.value}
            </span>
            <div
              className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
              style={{ height: `${Math.max(2, (d.value / max) * (height - 30))}px`, background: color }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((d) => (
          <div key={d.label} className="flex-1 truncate text-center text-[10px] font-medium text-slate-400">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GroupedBarChart({
  data,
  series,
  height = 220,
  format,
}: {
  data: { label: string; values: number[] }[];
  series: { name: string; color: string }[];
  height?: number;
  format?: (v: number) => string;
}) {
  const max = niceMax(data.flatMap((d) => d.values));
  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-1.5 sm:gap-3" style={{ height }}>
        {data.map((d) => (
          <div key={d.label} className="group flex flex-1 items-end justify-center gap-0.5">
            {d.values.map((v, i) => (
              <div key={i} className="relative flex-1">
                <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                  {format ? format(v) : v}
                </span>
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{ height: `${Math.max(2, (v / max) * (height - 24))}px`, background: series[i]?.color ?? "#94a3b8" }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-3">
        {data.map((d) => (
          <div key={d.label} className="flex-1 truncate text-center text-[10px] font-medium text-slate-400">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LineChart({ data, color = "#059669", height = 200, format }: { data: Point[]; color?: string; height?: number; format?: (v: number) => string }) {
  const gid = useId().replace(/:/g, "");
  const width = 600;
  const values = data.map((d) => d.value);
  const max = niceMax(values.map(Math.abs));
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((d, i) => [i * step, height - ((d.value - min) / range) * (height - 20) - 10] as const);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${width},${height} L0,${height} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[200px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g-${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-1 flex">
        {data.map((d) => (
          <div key={d.label} className="flex-1 truncate text-center text-[10px] font-medium text-slate-400" title={format ? format(d.value) : String(d.value)}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ data, size = 170 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = size / 2 - 14;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
          {total > 0 &&
            data.map((d) => {
              const len = (d.value / total) * circumference;
              const el = (
                <circle
                  key={d.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth="16"
                  strokeDasharray={`${len} ${circumference - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Total</span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="font-medium">{d.label}</span>
            <span className="ml-auto pl-3 font-semibold text-slate-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
