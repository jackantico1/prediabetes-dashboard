"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { estimateMealAction, saveMeal } from "@/app/(app)/food/actions";
import type { MealEstimate } from "@/lib/ai/estimateMeal";
import { GlucoseQuickAdd } from "@/components/glucose/GlucoseQuickAdd";

function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Macros = { carbsG: string; proteinG: string; fatG: string; fiberG: string; calories: string };
const EMPTY: Macros = { carbsG: "", proteinG: "", fatG: "", fiberG: "", calories: "" };

export function MealLogger({ aiEnabled, autoFocus = false }: { aiEnabled: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [tsInput, setTs] = useState("");
  const ts = tsInput || (mounted ? nowLocal() : "");
  const [macros, setMacros] = useState<Macros>(EMPTY);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [manual, setManual] = useState(!aiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [estimating, startEstimate] = useTransition();
  const [saving, startSave] = useTransition();


  function runEstimate() {
    setError(null);
    startEstimate(async () => {
      const res = await estimateMealAction(description);
      if (!res.ok) {
        setError(res.error);
        setManual(true);
        return;
      }
      setEstimate(res.estimate);
      const t = res.estimate.total;
      setMacros({ carbsG: r(t.carbs_g), proteinG: r(t.protein_g), fatG: r(t.fat_g), fiberG: r(t.fiber_g), calories: r(t.calories) });
    });
  }

  function save() {
    setError(null);
    startSave(async () => {
      const res = await saveMeal({
        description,
        ts: new Date(ts || nowLocal()).toISOString(),
        carbsG: opt(macros.carbsG),
        proteinG: opt(macros.proteinG),
        fatG: opt(macros.fatG),
        fiberG: opt(macros.fiberG),
        calories: opt(macros.calories),
        estimateConfidence: estimate?.confidence ?? null,
        estimateNotes: estimate ? [estimate.assumptions, estimate.glycemic_note].filter(Boolean).join(" ") : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedId(res.id);
      router.refresh();
    });
  }

  function reset() {
    setDescription("");
    setMacros(EMPTY);
    setEstimate(null);
    setSavedId(null);
    setTs("");
    setManual(!aiEnabled);
  }

  if (savedId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">Meal saved. Want to pair it with a glucose reading?</p>
        <p className="text-xs text-slate-500">Log one now if you just checked, or come back 1–2 hours after eating and log an after-meal reading. Either way it gets linked to this meal.</p>
        <GlucoseQuickAdd mealId={savedId} defaultTagOverride="before_meal" onSaved={reset} />
        <button type="button" className="btn-ghost" onClick={reset}>Skip, log another meal</button>
      </div>
    );
  }

  const hasMacros = Object.values(macros).some((v) => v !== "");

  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="meal-desc">What did you eat?</label>
        <textarea
          id="meal-desc"
          className="input min-h-[84px]"
          placeholder="e.g. Two scrambled eggs, a slice of sourdough toast with butter, and a small orange juice"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus={autoFocus}
          maxLength={1000}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {aiEnabled && (
          <button type="button" className="btn-primary" onClick={runEstimate} disabled={estimating || description.trim().length < 3}>
            {estimating ? "Estimating…" : estimate ? "Re-estimate" : "Estimate carbs & protein"}
          </button>
        )}
        {!manual && aiEnabled && (
          <button type="button" className="btn-ghost text-sm" onClick={() => setManual(true)}>Enter values myself</button>
        )}
        {!aiEnabled && <p className="text-xs text-slate-500">AI estimates aren&apos;t set up on this server. Enter what you know; everything is optional.</p>}
      </div>

      {estimate && (
        <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 text-sm space-y-2">
          <ul className="space-y-1">
            {estimate.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-slate-700">{it.name} <span className="text-slate-400">· {it.portion}</span></span>
                <span className="text-slate-500 tabular-nums whitespace-nowrap">{Math.round(it.carbs_g)}g carbs</span>
              </li>
            ))}
          </ul>
          {estimate.assumptions && <p className="text-xs text-slate-500">{estimate.assumptions}</p>}
          <p className="text-slate-800">{estimate.glycemic_note}</p>
          <p className="text-xs text-slate-400">Confidence: {estimate.confidence}. These are estimates; adjust anything below.</p>
        </div>
      )}

      {(manual || estimate) && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {(
            [
              ["carbsG", "Carbs (g)"],
              ["proteinG", "Protein (g)"],
              ["fiberG", "Fiber (g)"],
              ["fatG", "Fat (g)"],
              ["calories", "Calories"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="label text-xs" htmlFor={`meal-${key}`}>{label}</label>
              <input id={`meal-${key}`} className="input tabular-nums" type="number" inputMode="numeric" min={0} value={macros[key]} onChange={(e) => setMacros({ ...macros, [key]: e.target.value })} />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="meal-ts">When</label>
          <input id="meal-ts" className="input" type="datetime-local" value={ts} max={mounted ? nowLocal() : undefined} onChange={(e) => setTs(e.target.value)} />
        </div>
        <button type="button" className="btn-primary" onClick={save} disabled={saving || description.trim().length < 1 || (aiEnabled && !manual && !estimate)}>
          {saving ? "Saving…" : hasMacros ? "Save meal" : "Save without macros"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

const noopSubscribe = () => () => {};
const r = (n: number) => String(Math.round(n));
const opt = (s: string) => (s === "" ? null : Number(s));
