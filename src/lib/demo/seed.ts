import "server-only";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  dailyHealth,
  dexaScans,
  glucoseReadings,
  labReports,
  labResults,
  meals,
  weightEntries,
} from "@/db/schema";
import { newId } from "@/lib/ids";
import { localDate, shiftDate, zonedTime } from "@/lib/time";

/** Small deterministic PRNG so sample data looks the same every time. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO_MEALS = [
  { description: "Oatmeal with banana and honey", carbsG: 68, proteinG: 9, fatG: 6, fiberG: 6, calories: 360, rise: 62 },
  { description: "Greek yogurt with berries and walnuts", carbsG: 24, proteinG: 20, fatG: 12, fiberG: 4, calories: 290, rise: 18 },
  { description: "Grilled chicken salad with olive oil", carbsG: 16, proteinG: 42, fatG: 22, fiberG: 7, calories: 480, rise: 14 },
  { description: "Turkey sandwich on whole wheat, apple", carbsG: 58, proteinG: 30, fatG: 10, fiberG: 9, calories: 470, rise: 44 },
  { description: "Pasta with tomato sauce and garlic bread", carbsG: 96, proteinG: 22, fatG: 18, fiberG: 6, calories: 720, rise: 78 },
  { description: "Salmon, roasted broccoli, half cup of rice", carbsG: 30, proteinG: 38, fatG: 20, fiberG: 5, calories: 520, rise: 26 },
  { description: "Burrito bowl with chicken, beans, rice", carbsG: 72, proteinG: 40, fatG: 16, fiberG: 14, calories: 650, rise: 50 },
  { description: "Eggs, avocado, sautéed spinach", carbsG: 10, proteinG: 24, fatG: 28, fiberG: 7, calories: 400, rise: 8 },
  { description: "Pepperoni pizza, two slices", carbsG: 70, proteinG: 26, fatG: 28, fiberG: 4, calories: 620, rise: 66 },
  { description: "Lentil soup and side salad", carbsG: 42, proteinG: 18, fatG: 9, fiberG: 15, calories: 380, rise: 24 },
];

export interface SeedSummary {
  readings: number;
  meals: number;
  weights: number;
  healthDays: number;
  labs: number;
  dexa: number;
}

export async function seedDemoData(userId: string, tz: string, now = new Date()): Promise<SeedSummary> {
  await clearDemoData(userId);
  const db = await getDb();
  const rand = rng(42);
  const n = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const today = localDate(now, tz);
  const DAYS = 60;

  const glucoseRows: (typeof glucoseReadings.$inferInsert)[] = [];
  const mealRows: (typeof meals.$inferInsert)[] = [];
  const weightRows: (typeof weightEntries.$inferInsert)[] = [];
  const healthRows: (typeof dailyHealth.$inferInsert)[] = [];

  let weight = 198.4;
  for (let i = DAYS; i >= 0; i--) {
    const date = shiftDate(today, -i);
    const progress = 1 - i / DAYS; // 0 = two months ago, 1 = today
    const poorSleep = rand() < 0.3;
    const sleepHours = +(poorSleep ? n(5.1, 6.2) : n(6.8, 8.1)).toFixed(1);
    const active = rand() < 0.6;
    const steps = Math.round(active ? n(6500, 11500) : n(2500, 5500));

    // Fasting glucose: drifting from ~112 toward ~102, worse after short sleep.
    const fastingBase = 112 - 10 * progress + (poorSleep ? 6 : 0);
    const fastingTime = zonedTime(date, 6, 30 + Math.round(n(-10, 20)), tz);
    if (fastingTime <= now && rand() < 0.85) {
      glucoseRows.push({ id: newId(), userId, ts: fastingTime, valueMgdl: Math.round(fastingBase + n(-6, 6)), tag: "fasting", source: "demo" });
    }

    // One or two measured meals per day.
    const mealCount = rand() < 0.5 ? 2 : 1;
    const slots = mealCount === 2 ? [12, 18] : [18];
    for (const hour of slots) {
      const meal = DEMO_MEALS[Math.floor(rand() * DEMO_MEALS.length)];
      const mealTs = zonedTime(date, hour, Math.round(n(0, 45)), tz);
      if (mealTs > now) continue;
      const mealId = newId();
      mealRows.push({
        id: mealId,
        userId,
        ts: mealTs,
        description: meal.description,
        carbsG: meal.carbsG,
        proteinG: meal.proteinG,
        fatG: meal.fatG,
        fiberG: meal.fiberG,
        calories: meal.calories,
        estimateConfidence: "medium",
        source: "demo",
      });
      if (rand() < 0.7) {
        const before = Math.round(n(92, 108));
        glucoseRows.push({ id: newId(), userId, ts: new Date(mealTs.getTime() - 8 * 60_000), valueMgdl: before, tag: "before_meal", mealId, source: "demo" });
        const afterTs = new Date(mealTs.getTime() + Math.round(n(60, 95)) * 60_000);
        if (afterTs <= now) {
          glucoseRows.push({ id: newId(), userId, ts: afterTs, valueMgdl: Math.round(before + meal.rise * n(0.75, 1.2) - 8 * progress), tag: "after_meal", mealId, source: "demo" });
        }
      }
    }

    weight += n(-0.45, 0.25);
    if (rand() < 0.8) {
      weightRows.push({ id: newId(), userId, date, weightLbs: +weight.toFixed(1), bodyFatPct: +(28.6 - (198.4 - weight) * 0.18).toFixed(1), source: "demo" });
    }

    healthRows.push({
      id: newId(),
      userId,
      date,
      steps,
      activeMinutes: Math.round(active ? n(25, 70) : n(5, 20)),
      intensityMinutes: Math.round(active ? n(15, 45) : n(0, 10)),
      restingHr: Math.round(poorSleep ? n(64, 70) : n(57, 63)),
      hrvMs: Math.round(poorSleep ? n(28, 38) : n(38, 52)),
      sleepHours,
      deepHours: +(sleepHours * (poorSleep ? 0.11 : 0.18)).toFixed(1),
      remHours: +(sleepHours * (poorSleep ? 0.16 : 0.22)).toFixed(1),
      lightHours: +(sleepHours * 0.55).toFixed(1),
      awakeHours: +n(0.2, 0.6).toFixed(1),
      sleepScore: Math.round(poorSleep ? n(48, 64) : n(68, 88)),
      avgStress: Math.round(poorSleep ? n(35, 55) : n(22, 38)),
      bodyBatteryHigh: Math.round(poorSleep ? n(55, 72) : n(78, 96)),
      bodyBatteryLow: Math.round(n(8, 30)),
      calories: Math.round(n(2100, 2700)),
      source: "demo",
    });
  }

  // Labs: two panels, six months apart, improving.
  const labDate1 = shiftDate(today, -195);
  const labDate2 = shiftDate(today, -12);
  const r1 = newId();
  const r2 = newId();
  const labRows = [
    { reportId: r1, date: labDate1, marker: "HbA1c", value: 6.1, unit: "%", refMin: 4.0, refMax: 5.6 },
    { reportId: r1, date: labDate1, marker: "Fasting Glucose", value: 112, unit: "mg/dL", refMin: 70, refMax: 99 },
    { reportId: r1, date: labDate1, marker: "Triglycerides", value: 168, unit: "mg/dL", refMin: 0, refMax: 149 },
    { reportId: r1, date: labDate1, marker: "HDL", value: 41, unit: "mg/dL", refMin: 40, refMax: null },
    { reportId: r1, date: labDate1, marker: "LDL", value: 121, unit: "mg/dL", refMin: 0, refMax: 99 },
    { reportId: r2, date: labDate2, marker: "HbA1c", value: 5.9, unit: "%", refMin: 4.0, refMax: 5.6 },
    { reportId: r2, date: labDate2, marker: "Fasting Glucose", value: 106, unit: "mg/dL", refMin: 70, refMax: 99 },
    { reportId: r2, date: labDate2, marker: "Fasting Insulin", value: 11.2, unit: "µIU/mL", refMin: 2.6, refMax: 24.9 },
    { reportId: r2, date: labDate2, marker: "Triglycerides", value: 148, unit: "mg/dL", refMin: 0, refMax: 149 },
    { reportId: r2, date: labDate2, marker: "HDL", value: 44, unit: "mg/dL", refMin: 40, refMax: null },
    { reportId: r2, date: labDate2, marker: "LDL", value: 112, unit: "mg/dL", refMin: 0, refMax: 99 },
    { reportId: r2, date: labDate2, marker: "hs-CRP", value: 1.8, unit: "mg/L", refMin: 0, refMax: 3.0 },
  ];

  await db.insert(labReports).values([
    { id: r1, userId, date: labDate1, provider: "Sample lab", source: "demo" },
    { id: r2, userId, date: labDate2, provider: "Sample lab", source: "demo" },
  ]);
  await db.insert(labResults).values(labRows.map((l) => ({ id: newId(), userId, source: "demo" as const, ...l })));
  await db.insert(dexaScans).values({
    id: newId(),
    userId,
    date: shiftDate(today, -58),
    provider: "Sample DEXA",
    totalBodyFatPct: 28.6,
    leanMassLbs: 134.2,
    fatMassLbs: 56.7,
    totalMassLbs: 198.4,
    visceralFatLbs: 2.3,
    visceralFatAreaCm2: 118,
    boneDensityTScore: 0.4,
    androidGynoidRatio: 1.12,
    regional: { arms: { fatPct: 22.1 }, legs: { fatPct: 24.8 }, trunk: { fatPct: 33.4 } },
    source: "demo",
  });

  const chunk = async <T,>(rows: T[], insert: (xs: T[]) => Promise<unknown>) => {
    for (let i = 0; i < rows.length; i += 200) await insert(rows.slice(i, i + 200));
  };
  await chunk(mealRows, (xs) => db.insert(meals).values(xs));
  await chunk(glucoseRows, (xs) => db.insert(glucoseReadings).values(xs));
  await chunk(weightRows, (xs) => db.insert(weightEntries).values(xs));
  await chunk(healthRows, (xs) => db.insert(dailyHealth).values(xs));

  return { readings: glucoseRows.length, meals: mealRows.length, weights: weightRows.length, healthDays: healthRows.length, labs: labRows.length, dexa: 1 };
}

export async function clearDemoData(userId: string) {
  const db = await getDb();
  const demo = "demo" as const;
  await db.delete(glucoseReadings).where(and(eq(glucoseReadings.userId, userId), eq(glucoseReadings.source, demo)));
  await db.delete(meals).where(and(eq(meals.userId, userId), eq(meals.source, demo)));
  await db.delete(weightEntries).where(and(eq(weightEntries.userId, userId), eq(weightEntries.source, demo)));
  await db.delete(dailyHealth).where(and(eq(dailyHealth.userId, userId), eq(dailyHealth.source, demo)));
  await db.delete(labResults).where(and(eq(labResults.userId, userId), eq(labResults.source, demo)));
  await db.delete(labReports).where(and(eq(labReports.userId, userId), eq(labReports.source, demo)));
  await db.delete(dexaScans).where(and(eq(dexaScans.userId, userId), eq(dexaScans.source, demo)));
}

export async function hasDemoData(userId: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .select({ id: glucoseReadings.id })
    .from(glucoseReadings)
    .where(and(eq(glucoseReadings.userId, userId), eq(glucoseReadings.source, "demo")))
    .limit(1);
  return Boolean(row);
}
