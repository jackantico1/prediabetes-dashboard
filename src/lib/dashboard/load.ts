import "server-only";
import { listGlucose } from "@/lib/repo/glucose";
import { listMeals } from "@/lib/repo/meals";
import { latestWeight, listWeight } from "@/lib/repo/weight";
import { listLabResults, summarizeMarkers } from "@/lib/repo/labs";
import { listDailyHealth } from "@/lib/repo/dailyHealth";
import { getSettings } from "@/lib/repo/settings";
import { getGarminConnection } from "@/lib/repo/garmin";
import { computeGlucoseStats, dailyFastingSeries } from "@/lib/glucose/stats";
import { pairMealsWithGlucose } from "@/lib/food/pairing";
import { computeStreaks, generateActions } from "@/lib/coaching/engine";
import { daysAgo, localDate, shiftDate } from "@/lib/time";

export async function loadDashboard(userId: string, tz: string) {
  const now = new Date();
  const today = localDate(now, tz);
  const [settings, readings, mealRows, weight30, latestW, labs, health, garmin] = await Promise.all([
    getSettings(userId),
    listGlucose(userId, daysAgo(30, now), now),
    listMeals(userId, daysAgo(14, now), now),
    listWeight(userId, shiftDate(today, -30)),
    latestWeight(userId),
    listLabResults(userId),
    listDailyHealth(userId, shiftDate(today, -30)),
    getGarminConnection(userId),
  ]);

  const stats = computeGlucoseStats(readings, { fasting: settings.targetFastingMgdl, postMeal: settings.targetPostMealMgdl }, now, tz);
  const meals = pairMealsWithGlucose(mealRows, readings);
  const actions = generateActions({ stats, readings, meals, health, labs, settings, today });
  const streaks = computeStreaks({ readings, health, settings, today }, tz);
  const markers = summarizeMarkers(labs);
  const a1c = markers.find((m) => m.marker === "HbA1c") ?? null;

  const healthByDate = new Map(health.map((h) => [h.date, h]));
  const todayHealth = healthByDate.get(today) ?? null;
  const lastNight = todayHealth?.sleepHours != null ? todayHealth : healthByDate.get(shiftDate(today, -1)) ?? null;

  const oldestWeight = weight30.at(-1) ?? null;
  const weightChange30d = latestW && oldestWeight && latestW.id !== oldestWeight.id ? +(latestW.weightLbs - oldestWeight.weightLbs).toFixed(1) : null;

  return {
    today,
    settings,
    stats,
    fastingSeries: dailyFastingSeries(readings, tz),
    actions,
    streaks,
    a1c,
    weight: latestW,
    weightChange30d,
    todayHealth,
    lastNight,
    garminConnected: Boolean(garmin),
    counts: { readings: readings.length, meals: mealRows.length, labs: labs.length },
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;
