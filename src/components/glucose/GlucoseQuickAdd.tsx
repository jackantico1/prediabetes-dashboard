"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addReading } from "@/app/(app)/glucose/actions";
import type { GlucoseTag } from "@/db/schema";

const TAGS: { value: GlucoseTag; label: string; hint: string }[] = [
  { value: "fasting", label: "Fasting", hint: "First thing, before food" },
  { value: "before_meal", label: "Before meal", hint: "Right before eating" },
  { value: "after_meal", label: "After meal", hint: "1–2 hours after" },
  { value: "bedtime", label: "Bedtime", hint: "" },
  { value: "other", label: "Other", hint: "" },
];

function nowLocal() {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const noopSubscribe = () => () => {};

function defaultTag(): GlucoseTag {
  const h = new Date().getHours();
  return h < 10 ? "fasting" : "other";
}

export function GlucoseQuickAdd({ autoFocus = false, mealId, defaultTagOverride, onSaved }: { autoFocus?: boolean; mealId?: string; defaultTagOverride?: GlucoseTag; onSaved?: () => void }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  // Time-dependent defaults are derived only after mount so server and client HTML match.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [tagChoice, setTag] = useState<GlucoseTag | null>(defaultTagOverride ?? null);
  const tag: GlucoseTag = tagChoice ?? (mounted ? defaultTag() : "other");
  const [tsInput, setTs] = useState("");
  const ts = tsInput || (mounted ? nowLocal() : "");
  const [note, setNote] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await addReading({ valueMgdl: value, tag, ts: new Date(ts || nowLocal()).toISOString(), note, mealId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setValue("");
      setNote("");
      setTs("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="label" htmlFor="glucose-value">Glucose</label>
          <div className="relative">
            <input
              id="glucose-value"
              className="input text-2xl font-semibold tabular-nums pr-16"
              type="number"
              inputMode="numeric"
              min={20}
              max={600}
              required
              autoFocus={autoFocus}
              placeholder="98"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">mg/dL</span>
          </div>
        </div>
        <button type="submit" className="btn-primary h-[52px] px-5" disabled={pending || !value}>
          {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <div>
        <p className="label">When was this?</p>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {TAGS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={tag === t.value}
              onClick={() => setTag(t.value)}
              title={t.hint}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${tag === t.value ? "bg-teal-600 border-teal-600 text-white" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {showMore ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="glucose-ts">Time</label>
            <input id="glucose-ts" className="input" type="datetime-local" value={ts} max={mounted ? nowLocal() : undefined} onChange={(e) => setTs(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="glucose-note">Note</label>
            <input id="glucose-note" className="input" placeholder="e.g. after a walk" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} />
          </div>
        </div>
      ) : (
        <button type="button" className="text-sm text-teal-700 font-medium" onClick={() => setShowMore(true)}>
          Different time or add a note
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
