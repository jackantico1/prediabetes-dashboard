"use client";

interface Props {
  label: string;
  value: string;
  sub?: string;
  status?: "good" | "warn" | "bad" | "neutral";
  icon?: string;
}

const statusColor = {
  good: "border-l-emerald-400 bg-emerald-50",
  warn: "border-l-amber-400 bg-amber-50",
  bad: "border-l-red-400 bg-red-50",
  neutral: "border-l-slate-300 bg-white",
};

const valueColor = {
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-600",
  neutral: "text-slate-800",
};

export function MetricCard({ label, value, sub, status = "neutral", icon }: Props) {
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 shadow-sm p-4 ${statusColor[status]}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={`text-3xl font-bold mt-2 ${valueColor[status]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
