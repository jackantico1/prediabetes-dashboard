import type { GlucoseReading } from "@/db/schema";
import { localDate } from "@/lib/time";

export interface GlucoseTargets {
  fasting: number; // mg/dL, default 100
  postMeal: number; // mg/dL, default 140
}

export interface GlucoseStats {
  total: number;
  readingsLast7d: number;
  fasting: {
    latest: { value: number; ts: Date } | null;
    avg7d: number | null;
    avg30d: number | null;
    count30d: number;
    inTargetPct30d: number | null;
    /** Compares the last 14 days to the 14 before. Null until there is enough data. */
    trend: "improving" | "steady" | "worsening" | null;
    daysLogged7d: number;
  };
  postMeal: {
    avg30d: number | null;
    count30d: number;
    overTargetPct30d: number | null;
  };
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : null);

export function computeGlucoseStats(
  readings: GlucoseReading[],
  targets: GlucoseTargets,
  now: Date,
  tz: string
): GlucoseStats {
  const since = (days: number) => new Date(now.getTime() - days * 86_400_000);
  const sorted = [...readings].sort((a, b) => a.ts.getTime() - b.ts.getTime());

  const fasting = sorted.filter((r) => r.tag === "fasting");
  const fasting30 = fasting.filter((r) => r.ts >= since(30));
  const fasting7 = fasting.filter((r) => r.ts >= since(7));
  const fastingRecent14 = fasting.filter((r) => r.ts >= since(14));
  const fastingPrior14 = fasting.filter((r) => r.ts >= since(28) && r.ts < since(14));

  let trend: GlucoseStats["fasting"]["trend"] = null;
  if (fastingRecent14.length >= 4 && fastingPrior14.length >= 4) {
    const recent = avg(fastingRecent14.map((r) => r.valueMgdl))!;
    const prior = avg(fastingPrior14.map((r) => r.valueMgdl))!;
    const delta = recent - prior;
    trend = delta <= -3 ? "improving" : delta >= 3 ? "worsening" : "steady";
  }

  const postMeal30 = sorted.filter((r) => r.tag === "after_meal" && r.ts >= since(30));
  const latestFasting = fasting.at(-1);

  return {
    total: readings.length,
    readingsLast7d: sorted.filter((r) => r.ts >= since(7)).length,
    fasting: {
      latest: latestFasting ? { value: latestFasting.valueMgdl, ts: latestFasting.ts } : null,
      avg7d: avg(fasting7.map((r) => r.valueMgdl)),
      avg30d: avg(fasting30.map((r) => r.valueMgdl)),
      count30d: fasting30.length,
      inTargetPct30d: pct(fasting30.filter((r) => r.valueMgdl < targets.fasting).length, fasting30.length),
      trend,
      daysLogged7d: new Set(fasting7.map((r) => localDate(r.ts, tz))).size,
    },
    postMeal: {
      avg30d: avg(postMeal30.map((r) => r.valueMgdl)),
      count30d: postMeal30.length,
      overTargetPct30d: pct(postMeal30.filter((r) => r.valueMgdl > targets.postMeal).length, postMeal30.length),
    },
  };
}

/** Clinical bands for a single fasting reading (ADA). */
export function fastingStatus(value: number): "good" | "warn" | "bad" {
  return value < 100 ? "good" : value < 126 ? "warn" : "bad";
}

/** Status for a post-meal (1-2h) reading. */
export function postMealStatus(value: number, target = 140): "good" | "warn" | "bad" {
  return value <= target ? "good" : value < 200 ? "warn" : "bad";
}

export function statusFor(tag: GlucoseReading["tag"], value: number, targets: GlucoseTargets) {
  if (tag === "fasting") return value < targets.fasting ? "good" : value < 126 ? "warn" : "bad";
  if (tag === "after_meal") return postMealStatus(value, targets.postMeal);
  return value < 140 ? "good" : value < 180 ? "warn" : "bad";
}

/** Daily fasting series for charts: one point per local day (average if multiple). */
export function dailyFastingSeries(readings: GlucoseReading[], tz: string): { date: string; value: number }[] {
  const byDay = new Map<string, number[]>();
  for (const r of readings) {
    if (r.tag !== "fasting") continue;
    const d = localDate(r.ts, tz);
    byDay.set(d, [...(byDay.get(d) ?? []), r.valueMgdl]);
  }
  return [...byDay.entries()]
    .map(([date, vals]) => ({ date, value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
