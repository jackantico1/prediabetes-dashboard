"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logWeight } from "@/app/(app)/body/actions";

const noopSubscribe = () => () => {};
const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function WeightQuickAdd({ autoFocus = false, lastWeight }: { autoFocus?: boolean; lastWeight?: number | null }) {
  const router = useRouter();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [dateInput, setDate] = useState("");
  const date = dateInput || (mounted ? todayLocal() : "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await logWeight({ date: date || todayLocal(), weightLbs: weight, bodyFatPct: bodyFat === "" ? null : bodyFat });
      if (!res.ok) return setError(res.error);
      setWeight("");
      setBodyFat("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
      <div className="col-span-2 sm:col-span-1">
        <label className="label" htmlFor="weight-value">Weight</label>
        <div className="relative">
          <input id="weight-value" className="input text-2xl font-semibold tabular-nums pr-12" type="number" inputMode="decimal" step="0.1" min={50} max={700} required autoFocus={autoFocus} placeholder={lastWeight ? String(lastWeight) : "185.0"} value={weight} onChange={(e) => setWeight(e.target.value)} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">lbs</span>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="weight-bf">Body fat % <span className="text-slate-400 font-normal">(optional)</span></label>
        <input id="weight-bf" className="input tabular-nums" type="number" inputMode="decimal" step="0.1" min={2} max={70} value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="weight-date">Date</label>
        <input id="weight-date" className="input" type="date" value={date} max={mounted ? todayLocal() : undefined} onChange={(e) => setDate(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary h-[46px]" disabled={pending || !weight}>
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
      {error && <p className="col-span-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
