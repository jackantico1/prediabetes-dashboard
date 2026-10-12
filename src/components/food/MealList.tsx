"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeMeal } from "@/app/(app)/food/actions";
import type { MealWithResponse } from "@/lib/food/pairing";

interface Props {
  meals: MealWithResponse[];
  postMealTarget: number;
  tz: string;
}

function riseStyle(rise: number | null, peak: number | null, target: number) {
  if (rise === null && peak === null) return "bg-slate-100 text-slate-500";
  if ((peak ?? 0) > target + 40 || (rise ?? 0) >= 60) return "bg-red-100 text-red-700";
  if ((peak ?? 0) > target || (rise ?? 0) >= 35) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export function MealList({ meals, postMealTarget, tz }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const fmtDay = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });

  const groups = new Map<string, MealWithResponse[]>();
  for (const m of meals) {
    const k = fmtDay.format(m.ts);
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }

  function del(id: string) {
    if (!confirm("Delete this meal? Linked glucose readings are kept.")) return;
    start(async () => {
      await removeMeal(id);
      router.refresh();
    });
  }

  return (
    <div className={`space-y-5 ${pending ? "opacity-60" : ""}`}>
      {[...groups.entries()].map(([day, rows]) => (
        <div key={day}>
          <p className="text-xs font-semibold text-slate-500 mb-2">{day}</p>
          <ul className="card divide-y divide-slate-100">
            {rows.map((m) => {
              const r = m.response;
              const label = r?.rise !== null && r?.rise !== undefined ? `+${r.rise}` : r?.peak ? `${r.peak} after` : r?.before ? `${r.before.valueMgdl} before` : "no reading";
              return (
                <li key={m.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{m.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {fmtTime.format(m.ts)}
                      {m.carbsG != null && <> · <span className="font-medium text-slate-700">{Math.round(m.carbsG)}g carbs</span></>}
                      {m.proteinG != null && <> · {Math.round(m.proteinG)}g protein</>}
                      {m.fiberG != null && <> · {Math.round(m.fiberG)}g fiber</>}
                      {m.calories != null && <> · {Math.round(m.calories)} kcal</>}
                      {m.source === "demo" && <span className="uppercase tracking-wide text-[10px] text-slate-400"> · sample</span>}
                    </p>
                    {m.estimateNotes && <p className="text-xs text-slate-500 mt-1">{m.estimateNotes}</p>}
                    {r && (r.before || r.after.length > 0) && (
                      <p className="text-xs text-slate-500 mt-1">
                        Glucose: {r.before ? `${r.before.valueMgdl} before` : "no before reading"}
                        {r.after.length ? ` → ${r.after.map((a) => a.valueMgdl).join(", ")} after` : " · no after reading yet"}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full tabular-nums ${riseStyle(r?.rise ?? null, r?.peak ?? null, postMealTarget)}`} title="Glucose rise after this meal (mg/dL)">
                    {label}
                  </span>
                  <button type="button" onClick={() => del(m.id)} className="text-slate-400 hover:text-red-600 text-sm px-1" aria-label="Delete meal">✕</button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
