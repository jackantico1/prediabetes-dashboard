"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LabResult } from "@/db/schema";
import { MARKER_HELP, markerStatus } from "@/lib/labs/markers";
import { formatShortDate } from "@/lib/time";
import { removeLabResult } from "@/app/(app)/labs/actions";

interface Summary {
  marker: string;
  latest: LabResult;
  previous: LabResult | null;
  history: LabResult[];
}

const ring = { good: "border-l-emerald-500", warn: "border-l-amber-500", bad: "border-l-red-500", neutral: "border-l-slate-300" };

function refText(r: LabResult) {
  if (r.refMin != null && r.refMax != null) return `${r.refMin}–${r.refMax}`;
  if (r.refMax != null) return `< ${r.refMax}`;
  if (r.refMin != null) return `> ${r.refMin}`;
  return null;
}

export function MarkerCards({ markers }: { markers: Summary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function del(id: string) {
    if (!confirm("Delete this result?")) return;
    start(async () => {
      await removeLabResult(id);
      router.refresh();
    });
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${pending ? "opacity-60" : ""}`}>
      {markers.map((m) => {
        const status = markerStatus(m.marker, m.latest.value, m.latest.refMin, m.latest.refMax);
        const delta = m.previous ? +(m.latest.value - m.previous.value).toFixed(2) : null;
        const lowerIsBetter = m.marker !== "HDL" && m.marker !== "Vitamin D";
        const deltaGood = delta === null ? null : lowerIsBetter ? delta <= 0 : delta >= 0;
        const ref = refText(m.latest);
        const expanded = open === m.marker;
        return (
          <div key={m.marker} className={`card border-l-4 p-4 ${ring[status]}`}>
            <button type="button" className="w-full text-left" onClick={() => setOpen(expanded ? null : m.marker)} aria-expanded={expanded}>
              <p className="card-title">{m.marker}</p>
              <p className="mt-1.5">
                <span className="text-2xl font-bold tabular-nums text-slate-900">{m.latest.value}</span>
                <span className="text-sm text-slate-500 ml-1">{m.latest.unit}</span>
                {delta !== null && (
                  <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${deltaGood ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {formatShortDate(m.latest.date)}
                {ref && ` · ref ${ref}`}
                {m.previous && ` · was ${m.previous.value} on ${formatShortDate(m.previous.date)}`}
              </p>
            </button>
            {expanded && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-2">
                {MARKER_HELP[m.marker] && <p>{MARKER_HELP[m.marker]}</p>}
                <ul className="space-y-1">
                  {m.history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 tabular-nums">
                      <span>{formatShortDate(h.date)}{h.source === "demo" && <span className="uppercase tracking-wide text-[10px] text-slate-400"> · sample</span>}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{h.value} {h.unit}</span>
                        <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => del(h.id)} aria-label="Delete result">✕</button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
