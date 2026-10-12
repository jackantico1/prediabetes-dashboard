"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeReading } from "@/app/(app)/glucose/actions";
import type { GlucoseReading } from "@/db/schema";
import { statusFor, type GlucoseTargets } from "@/lib/glucose/stats";

const TAG_LABEL: Record<GlucoseReading["tag"], string> = {
  fasting: "Fasting",
  before_meal: "Before meal",
  after_meal: "After meal",
  bedtime: "Bedtime",
  other: "Other",
};

const STATUS_DOT = { good: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" };

interface Props {
  readings: GlucoseReading[];
  targets: GlucoseTargets;
  tz: string;
}

export function ReadingsList({ readings, targets, tz }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const groups = new Map<string, GlucoseReading[]>();
  for (const r of readings) {
    const key = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(r.ts);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  function del(id: string) {
    if (!confirm("Delete this reading?")) return;
    start(async () => {
      await removeReading(id);
      router.refresh();
    });
  }

  return (
    <div className={`space-y-5 ${pending ? "opacity-60" : ""}`}>
      {[...groups.entries()].map(([day, rows]) => (
        <div key={day}>
          <p className="text-xs font-semibold text-slate-500 mb-2">{day}</p>
          <ul className="divide-y divide-slate-100 card">
            {rows.map((r) => {
              const status = statusFor(r.tag, r.valueMgdl, targets);
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} aria-label={status} />
                  <span className="text-lg font-semibold tabular-nums text-slate-900 w-14">{r.valueMgdl}</span>
                  <span className="text-sm text-slate-600 flex-1 min-w-0">
                    {TAG_LABEL[r.tag]}
                    <span className="text-slate-400"> · {new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(r.ts)}</span>
                    {r.note && <span className="block text-xs text-slate-500 truncate">{r.note}</span>}
                  </span>
                  {r.source === "demo" && <span className="text-[10px] uppercase tracking-wide text-slate-400">sample</span>}
                  <button type="button" onClick={() => del(r.id)} className="text-slate-400 hover:text-red-600 text-sm px-1" aria-label="Delete reading">✕</button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
