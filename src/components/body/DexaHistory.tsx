"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeDexa } from "@/app/(app)/body/actions";
import type { DexaScan } from "@/db/schema";
import { formatShortDate } from "@/lib/time";

const f = (n: number | null, unit = "", d = 1) => (n == null ? "—" : `${+n.toFixed(d)}${unit}`);

export function DexaHistory({ scans }: { scans: DexaScan[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function del(id: string) {
    if (!confirm("Delete this scan?")) return;
    start(async () => {
      await removeDexa(id);
      router.refresh();
    });
  }
  return (
    <div className={`overflow-x-auto ${pending ? "opacity-60" : ""}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Body fat</th>
            <th className="py-2 pr-3 font-medium">Visceral fat</th>
            <th className="py-2 pr-3 font-medium">Lean mass</th>
            <th className="py-2 pr-3 font-medium">Fat mass</th>
            <th className="py-2 pr-3 font-medium">Trunk fat</th>
            <th className="py-2 pr-3 font-medium">A/G</th>
            <th className="py-2 pr-3 font-medium">BMD T</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr key={s.id} className="border-b border-slate-50 tabular-nums">
              <td className="py-2 pr-3 whitespace-nowrap">
                {formatShortDate(s.date)}
                {s.provider && <span className="block text-xs text-slate-400">{s.provider}</span>}
                {s.source === "demo" && <span className="block text-[10px] uppercase tracking-wide text-slate-400">sample</span>}
              </td>
              <td className="py-2 pr-3 font-semibold">{f(s.totalBodyFatPct, "%")}</td>
              <td className="py-2 pr-3">{f(s.visceralFatLbs, " lbs", 2)}{s.visceralFatAreaCm2 != null && <span className="block text-xs text-slate-400">{Math.round(s.visceralFatAreaCm2)} cm²</span>}</td>
              <td className="py-2 pr-3">{f(s.leanMassLbs, " lbs")}</td>
              <td className="py-2 pr-3">{f(s.fatMassLbs, " lbs")}</td>
              <td className="py-2 pr-3">{f(s.regional?.trunk?.fatPct ?? null, "%")}</td>
              <td className="py-2 pr-3">{f(s.androidGynoidRatio, "", 2)}</td>
              <td className="py-2 pr-3">{f(s.boneDensityTScore)}</td>
              <td className="py-2 text-right"><button type="button" onClick={() => del(s.id)} className="text-slate-400 hover:text-red-600 px-1" aria-label="Delete scan">✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
