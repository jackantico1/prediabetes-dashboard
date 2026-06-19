"use client";

import type { CoachingAction, HabitStreak } from "@/lib/coaching/engine";

const priorityStyles = {
  high: "bg-red-50 border-red-200 text-red-700",
  medium: "bg-amber-50 border-amber-200 text-amber-700",
  low: "bg-slate-50 border-slate-200 text-slate-600",
};

const categoryIcon: Record<string, string> = {
  glucose: "🩸",
  sleep: "🌙",
  activity: "🏃",
  meal: "🥗",
  general: "🎯",
};

interface Props {
  actions: CoachingAction[];
  streaks: HabitStreak[];
}

export function CoachingPanel({ actions, streaks }: Props) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Your Action Plan</h2>

      <div className="space-y-3">
        {actions.map((a) => (
          <div key={a.id} className={`rounded-xl border p-4 ${priorityStyles[a.priority]}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{categoryIcon[a.category]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${priorityStyles[a.priority]}`}>
                    {a.priority}
                  </span>
                </div>
                <p className="text-xs mt-1 opacity-80">{a.detail}</p>
                {a.evidence && <p className="text-xs mt-1 opacity-60 italic">Evidence: {a.evidence}</p>}
                <p className="text-xs mt-1 font-medium">Impact: {a.impact}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Habit Streaks</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {streaks.map((s) => (
            <div key={s.habit} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{s.currentStreak}<span className="text-sm font-normal text-slate-400"> days</span></p>
              <p className="text-xs font-medium text-slate-700 mt-0.5">{s.habit}</p>
              <p className="text-xs text-slate-400">Best: {s.bestStreak}d</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${s.completedToday ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                {s.completedToday ? "✓ Today" : "Not yet today"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
