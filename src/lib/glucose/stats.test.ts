import { describe, expect, it } from "vitest";
import type { GlucoseReading } from "@/db/schema";
import { computeGlucoseStats, dailyFastingSeries, fastingStatus } from "./stats";

const NOW = new Date("2026-06-30T12:00:00Z");
const TZ = "UTC";

function reading(daysAgo: number, value: number, tag: GlucoseReading["tag"] = "fasting", hour = 6): GlucoseReading {
  const ts = new Date(NOW.getTime() - daysAgo * 86_400_000);
  ts.setUTCHours(hour, 0, 0, 0);
  return { id: `${daysAgo}-${tag}-${value}`, userId: "u", ts, valueMgdl: value, tag, note: null, mealId: null, source: "manual", createdAt: ts };
}

describe("computeGlucoseStats", () => {
  it("handles no data", () => {
    const s = computeGlucoseStats([], { fasting: 100, postMeal: 140 }, NOW, TZ);
    expect(s.total).toBe(0);
    expect(s.fasting.avg7d).toBeNull();
    expect(s.fasting.trend).toBeNull();
    expect(s.postMeal.overTargetPct30d).toBeNull();
  });

  it("computes fasting averages, target pct and improving trend", () => {
    const readings: GlucoseReading[] = [];
    for (let d = 0; d < 14; d++) readings.push(reading(d, 98)); // recent two weeks
    for (let d = 14; d < 28; d++) readings.push(reading(d, 110)); // prior two weeks
    const s = computeGlucoseStats(readings, { fasting: 100, postMeal: 140 }, NOW, TZ);
    expect(s.fasting.avg7d).toBe(98);
    expect(s.fasting.count30d).toBe(28);
    expect(s.fasting.avg30d).toBe(104);
    expect(s.fasting.inTargetPct30d).toBe(50);
    expect(s.fasting.trend).toBe("improving");
    expect(s.fasting.daysLogged7d).toBe(7);
    expect(s.fasting.latest?.value).toBe(98);
  });

  it("post-meal stats only count after_meal readings", () => {
    const readings = [reading(1, 150, "after_meal", 13), reading(2, 130, "after_meal", 13), reading(2, 95, "before_meal", 12)];
    const s = computeGlucoseStats(readings, { fasting: 100, postMeal: 140 }, NOW, TZ);
    expect(s.postMeal.count30d).toBe(2);
    expect(s.postMeal.avg30d).toBe(140);
    expect(s.postMeal.overTargetPct30d).toBe(50);
  });
});

describe("dailyFastingSeries", () => {
  it("averages multiple fasting readings per day and sorts ascending", () => {
    const series = dailyFastingSeries([reading(1, 100), reading(1, 104, "fasting", 7), reading(0, 99), reading(0, 150, "after_meal")], TZ);
    expect(series).toEqual([
      { date: "2026-06-29", value: 102 },
      { date: "2026-06-30", value: 99 },
    ]);
  });
});

describe("fastingStatus", () => {
  it("uses ADA bands", () => {
    expect(fastingStatus(99)).toBe("good");
    expect(fastingStatus(100)).toBe("warn");
    expect(fastingStatus(126)).toBe("bad");
  });
});
