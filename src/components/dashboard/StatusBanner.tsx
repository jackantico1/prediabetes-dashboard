"use client";

interface Props {
  hba1c: number;
  avgGlucose: number;
  timeInRange: number; // 0-100
  trend: "improving" | "flat" | "worsening";
}

const trendConfig = {
  improving: { label: "Improving ↑", bg: "bg-emerald-500", text: "text-emerald-700", badge: "bg-emerald-100" },
  flat: { label: "Holding Steady →", bg: "bg-amber-500", text: "text-amber-700", badge: "bg-amber-100" },
  worsening: { label: "Needs Attention ↓", bg: "bg-red-500", text: "text-red-700", badge: "bg-red-100" },
};

export function StatusBanner({ hba1c, avgGlucose, timeInRange, trend }: Props) {
  const cfg = trendConfig[trend];
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Prediabetes Status</p>
        <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${cfg.badge} ${cfg.text}`}>
          {cfg.label}
        </span>
        <p className="text-slate-500 text-sm mt-2 max-w-md">
          This app is for personal tracking only — not medical advice. Consult your doctor about any health decisions.
        </p>
      </div>
      <div className="flex gap-6">
        <Stat label="Est. HbA1c" value={`${hba1c.toFixed(1)}%`} target="< 5.7%" warn={hba1c >= 5.7} />
        <Stat label="Avg Glucose" value={`${avgGlucose} mg/dL`} target="< 100" warn={avgGlucose >= 100} />
        <Stat label="Time in Range" value={`${timeInRange}%`} target="> 70%" warn={timeInRange < 70} />
      </div>
    </div>
  );
}

function Stat({ label, value, target, warn }: { label: string; value: string; target: string; warn: boolean }) {
  return (
    <div className="text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${warn ? "text-red-500" : "text-emerald-600"}`}>{value}</p>
      <p className="text-xs text-slate-400">Target: {target}</p>
    </div>
  );
}
