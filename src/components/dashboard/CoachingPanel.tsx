"use client";

import { useState } from "react";
import type { CoachingAction, HabitStreak } from "@/lib/coaching/engine";

const priorityStyles: Record<CoachingAction["priority"], string> = {
  high: "bg-rose-50 border-rose-200",
  medium: "bg-amber-50 border-amber-200",
  low: "bg-slate-50 border-slate-200",
};
const priorityLabel: Record<CoachingAction["priority"], string> = { high: "Start here", medium: "This week", low: "Keep going" };
const icon: Record<CoachingAction["category"], string> = {
  glucose: "🩸",
  sleep: "🌙",
  activity: "🏃",
  meal: "🥗",
  labs: "🧪",
  logging: "✍️",
};

export function ActionList({ actions, limit }: { actions: CoachingAction[]; limit?: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const shown = limit ? actions.slice(0, limit) : actions;
  if (!shown.length) return null;
  return (
    <ul className="space-y-3">
      {shown.map((a) => {
        const expanded = open === a.id;
        return (
          <li key={a.id} className={`rounded-xl border p-4 ${priorityStyles[a.priority]}`}>
            <button type="button" onClick={() => setOpen(expanded ? null : a.id)} className="w-full text-left flex items-start gap-3" aria-expanded={expanded}>
              <span className="text-xl mt-0.5" aria-hidden>{icon[a.category]}</span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-slate-800">{a.title}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 border border-black/5 text-slate-600 font-medium">{priorityLabel[a.priority]}</span>
                </span>
                <span className="block text-sm text-slate-700 mt-1">{a.detail}</span>
                {a.evidence && <span className="block text-xs text-slate-500 mt-1">{a.evidence}</span>}
                {expanded && <span className="block text-sm text-slate-700 mt-2 pt-2 border-t border-black/5"><span className="font-medium">Why it matters: </span>{a.why}</span>}
              </span>
              <span className="text-slate-400 text-sm mt-1" aria-hidden>{expanded ? "−" : "+"}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Streaks({ streaks }: { streaks: HabitStreak[] }) {
  if (!streaks.length) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {streaks.map((s) => (
        <div key={s.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-2xl font-bold text-teal-700 tabular-nums">
            {s.currentStreak}
            <span className="text-sm font-normal text-slate-400"> {s.currentStreak === 1 ? "day" : "days"}</span>
          </p>
          <p className="text-xs font-medium text-slate-700 mt-0.5">{s.habit}</p>
          <span className={`inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full ${s.completedToday ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
            {s.completedToday ? "✓ Done today" : "Not yet today"}
          </span>
        </div>
      ))}
    </div>
  );
}
