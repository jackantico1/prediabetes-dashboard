import { describe, expect, it } from "vitest";
import type { DailyHealth, GlucoseReading, LabResult, UserSettings } from "@/db/schema";
import { computeStreaks, generateActions } from "./engine";
import { computeGlucoseStats } from "@/lib/glucose/stats";

const NOW = new Date("2026-06-30T12:00:00Z");
const TODAY = "2026-06-30";
const settings: UserSettings = { userId: "u", targetFastingMgdl: 100, targetPostMealMgdl: 140, targetSteps: 7000, targetSleepHours: 7, onboardingDone: true, updatedAt: NOW };

const fasting = (daysAgo: number, value: number): GlucoseReading => {
  const ts = new Date(NOW.getTime() - daysAgo * 86_400_000);
  ts.setUTCHours(6, 0, 0, 0);
  return { id: `f${daysAgo}`, userId: "u", ts, valueMgdl: value, tag: "fasting", note: null, mealId: null, source: "manual", createdAt: ts };
};
const health = (daysAgo: number, patch: Partial<DailyHealth>): DailyHealth => ({
  id: `h${daysAgo}`, userId: "u", date: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10),
  steps: null, activeMinutes: null, intensityMinutes: null, restingHr: null, hrvMs: null, sleepHours: null, deepHours: null, remHours: null,
  lightHours: null, awakeHours: null, sleepScore: null, avgStress: null, bodyBatteryHigh: null, bodyBatteryLow: null, calories: null, source: "garmin", updatedAt: NOW, ...patch,
});
const lab = (date: string, value: number): LabResult => ({ id: date, userId: "u", reportId: null, date, marker: "HbA1c", value, unit: "%", refMin: 4, refMax: 5.6, source: "manual", createdAt: NOW });

function run(readings: GlucoseReading[], h: DailyHealth[] = [], labs: LabResult[] = []) {
  const stats = computeGlucoseStats(readings, { fasting: 100, postMeal: 140 }, NOW, "UTC");
  return generateActions({ stats, readings, meals: [], health: h, labs, settings, today: TODAY });
}

describe("generateActions", () => {
  it("says nothing for a brand new user", () => {
    expect(run([])).toEqual([]);
  });

  it("flags high fasting glucose only with enough readings", () => {
    expect(run([fasting(0, 115), fasting(1, 115)]).find((a) => a.id === "fasting-high")).toBeUndefined();
    const actions = run(Array.from({ length: 10 }, (_, i) => fasting(i, 115)));
    const a = actions.find((x) => x.id === "fasting-high");
    expect(a?.priority).toBe("high");
    expect(a?.detail).toContain("115 mg/dL");
  });

  it("asks for more logging when fasting readings are sparse", () => {
    const actions = run([fasting(0, 95), fasting(20, 95)]);
    expect(actions.map((a) => a.id)).toContain("log-fasting");
  });

  it("uses wearable data for sleep and steps rules only when present", () => {
    const h = Array.from({ length: 7 }, (_, i) => health(i, { sleepHours: i % 2 ? 5.5 : 7.5, steps: 3000 }));
    const ids = run([], h).map((a) => a.id);
    expect(ids).toContain("sleep");
    expect(ids).toContain("steps");
  });

  it("reports A1c direction from labs", () => {
    const a = run([], [], [lab("2026-01-01", 6.1), lab("2026-06-01", 5.9)]).find((x) => x.id === "a1c");
    expect(a?.detail).toContain("5.9%");
    expect(a?.detail).toContain("down 0.2");
  });

  it("sorts high priority first", () => {
    const readings = Array.from({ length: 10 }, (_, i) => fasting(i, 118));
    const actions = run(readings, [], [lab("2026-06-01", 5.9)]);
    expect(actions[0].priority).toBe("high");
    expect(actions.at(-1)?.priority).toBe("low");
  });
});

describe("computeStreaks", () => {
  it("counts consecutive fasting-log days, allowing today to be pending", () => {
    const readings = [fasting(1, 95), fasting(2, 95), fasting(3, 95), fasting(5, 95)];
    const [s] = computeStreaks({ readings, health: [], settings, today: TODAY }, "UTC");
    expect(s.habit).toBe("Fasting reading logged");
    expect(s.currentStreak).toBe(3);
    expect(s.completedToday).toBe(false);
  });

  it("only includes wearable streaks when data exists", () => {
    const s = computeStreaks({ readings: [], health: [health(0, { steps: 8000 }), health(1, { steps: 9000 })], settings, today: TODAY }, "UTC");
    expect(s.map((x) => x.id)).toEqual(["steps"]);
    expect(s[0].currentStreak).toBe(2);
    expect(s[0].completedToday).toBe(true);
  });
});
