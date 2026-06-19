import { subDays, subHours, addMinutes, format, startOfDay } from "date-fns";
import type {
  DataSourceAdapter,
  DateRange,
  GlucoseReading,
  SleepRecord,
  LabResult,
  WeightRecord,
  MealRecord,
  ActivityRecord,
} from "./types";

// Seeded prediabetic profile: HbA1c ~5.9%, fasting glucose ~105, frequent post-meal spikes
function seedGlucose(range: DateRange): GlucoseReading[] {
  const readings: GlucoseReading[] = [];
  const now = new Date();
  let cursor = new Date(range.start);

  while (cursor <= range.end) {
    const dayStart = startOfDay(cursor);
    // Fasting reading ~5am
    const fasting = 98 + Math.round((Math.random() - 0.5) * 18);
    readings.push({
      timestamp: addMinutes(dayStart, 300),
      value: fasting,
      mealTag: "fasting",
    });

    // Breakfast spike ~7:30am
    const breakfastBase = fasting - 5;
    for (let m = 0; m <= 120; m += 5) {
      const t = m / 60;
      const spike = m < 45 ? breakfastBase + 55 * Math.sin((Math.PI * m) / 45) : breakfastBase + 55 * Math.exp(-0.025 * (m - 45));
      readings.push({
        timestamp: addMinutes(dayStart, 450 + m),
        value: Math.round(spike + (Math.random() - 0.5) * 6),
        mealTag: m === 0 ? "pre" : m === 45 ? "post" : undefined,
      });
    }

    // Lunch spike ~12:30pm
    const lunchBase = breakfastBase + 2;
    for (let m = 0; m <= 120; m += 5) {
      const spike = m < 50 ? lunchBase + 48 * Math.sin((Math.PI * m) / 50) : lunchBase + 48 * Math.exp(-0.022 * (m - 50));
      readings.push({
        timestamp: addMinutes(dayStart, 750 + m),
        value: Math.round(spike + (Math.random() - 0.5) * 6),
        mealTag: m === 0 ? "pre" : undefined,
      });
    }

    // Dinner spike ~6:30pm — worst spike of the day
    const dinnerBase = lunchBase - 3;
    for (let m = 0; m <= 150; m += 5) {
      const spike = m < 60 ? dinnerBase + 68 * Math.sin((Math.PI * m) / 60) : dinnerBase + 68 * Math.exp(-0.018 * (m - 60));
      readings.push({
        timestamp: addMinutes(dayStart, 1110 + m),
        value: Math.round(spike + (Math.random() - 0.5) * 8),
        mealTag: m === 0 ? "pre" : undefined,
      });
    }

    cursor = addMinutes(cursor, 1440);
  }

  return readings.filter((r) => r.timestamp <= now);
}

function seedSleep(range: DateRange): SleepRecord[] {
  const records: SleepRecord[] = [];
  let cursor = new Date(range.start);
  while (cursor <= range.end) {
    const poor = Math.random() < 0.35; // 35% chance of poor sleep
    const duration = poor ? 5.2 + Math.random() * 0.8 : 6.8 + Math.random() * 1.2;
    records.push({
      date: format(cursor, "yyyy-MM-dd"),
      durationHours: parseFloat(duration.toFixed(1)),
      deepHours: parseFloat((duration * (poor ? 0.1 : 0.18)).toFixed(1)),
      remHours: parseFloat((duration * (poor ? 0.15 : 0.22)).toFixed(1)),
      score: poor ? Math.round(48 + Math.random() * 15) : Math.round(65 + Math.random() * 20),
      hrv: poor ? Math.round(28 + Math.random() * 8) : Math.round(38 + Math.random() * 12),
      restingHR: poor ? Math.round(68 + Math.random() * 6) : Math.round(60 + Math.random() * 6),
    });
    cursor = addMinutes(cursor, 1440);
  }
  return records;
}

const LABS: LabResult[] = [
  { date: "2026-03-10", marker: "HbA1c", value: 5.9, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
  { date: "2025-09-15", marker: "HbA1c", value: 6.1, unit: "%", referenceMin: 4.0, referenceMax: 5.6 },
  { date: "2026-03-10", marker: "Fasting Glucose", value: 107, unit: "mg/dL", referenceMin: 70, referenceMax: 99 },
  { date: "2025-09-15", marker: "Fasting Glucose", value: 112, unit: "mg/dL", referenceMin: 70, referenceMax: 99 },
  { date: "2026-03-10", marker: "Fasting Insulin", value: 11.2, unit: "µIU/mL", referenceMin: 2, referenceMax: 8 },
  { date: "2026-03-10", marker: "hs-CRP", value: 1.8, unit: "mg/L", referenceMin: 0, referenceMax: 1.0 },
  { date: "2026-03-10", marker: "Triglycerides", value: 148, unit: "mg/dL", referenceMin: 0, referenceMax: 150 },
  { date: "2026-03-10", marker: "HDL", value: 44, unit: "mg/dL", referenceMin: 40, referenceMax: 999 },
  { date: "2026-03-10", marker: "LDL", value: 112, unit: "mg/dL", referenceMin: 0, referenceMax: 130 },
  { date: "2026-03-10", marker: "Uric Acid", value: 6.1, unit: "mg/dL", referenceMin: 2.6, referenceMax: 6.0 },
  { date: "2026-03-10", marker: "Omega-3 Index", value: 4.8, unit: "%", referenceMin: 8, referenceMax: 12 },
];

function seedWeight(range: DateRange): WeightRecord[] {
  const records: WeightRecord[] = [];
  let cursor = new Date(range.start);
  let weight = 198;
  while (cursor <= range.end) {
    weight += (Math.random() - 0.52) * 0.3; // slow downward drift
    records.push({
      date: format(cursor, "yyyy-MM-dd"),
      weightLbs: parseFloat(weight.toFixed(1)),
      bodyFatPct: parseFloat((28.5 - (198 - weight) * 0.15).toFixed(1)),
    });
    cursor = addMinutes(cursor, 1440);
  }
  return records;
}

const MEALS: MealRecord[] = [
  {
    id: "m1",
    timestamp: subHours(new Date(), 18),
    description: "Oatmeal with banana and honey",
    carbsG: 72,
    proteinG: 8,
    fiberG: 4,
    glucoseResponse: { baselineGlucose: 98, peakGlucose: 168, minutesToPeak: 45, auc2h: 4200 },
  },
  {
    id: "m2",
    timestamp: subHours(new Date(), 12),
    description: "Grilled chicken salad with olive oil",
    carbsG: 18,
    proteinG: 42,
    fiberG: 7,
    glucoseResponse: { baselineGlucose: 102, peakGlucose: 128, minutesToPeak: 35, auc2h: 1800 },
  },
  {
    id: "m3",
    timestamp: subHours(new Date(), 5),
    description: "Pasta with tomato sauce and garlic bread",
    carbsG: 95,
    proteinG: 22,
    fiberG: 5,
    glucoseResponse: { baselineGlucose: 100, peakGlucose: 178, minutesToPeak: 55, auc2h: 5600 },
  },
  {
    id: "m4",
    timestamp: subDays(new Date(), 1),
    description: "Eggs with avocado and vegetables",
    carbsG: 12,
    proteinG: 28,
    fiberG: 8,
    glucoseResponse: { baselineGlucose: 95, peakGlucose: 118, minutesToPeak: 30, auc2h: 1400 },
  },
];

function seedActivity(range: DateRange): ActivityRecord[] {
  const records: ActivityRecord[] = [];
  let cursor = new Date(range.start);
  while (cursor <= range.end) {
    const active = Math.random() < 0.6;
    records.push({
      date: format(cursor, "yyyy-MM-dd"),
      steps: active ? Math.round(6000 + Math.random() * 6000) : Math.round(2000 + Math.random() * 3000),
      activeMinutes: active ? Math.round(25 + Math.random() * 45) : Math.round(5 + Math.random() * 20),
      trainingLoad: active ? Math.round(40 + Math.random() * 60) : Math.round(5 + Math.random() * 20),
      vo2Max: 36 + Math.random() * 2,
      stressScore: Math.round(28 + Math.random() * 35),
    });
    cursor = addMinutes(cursor, 1440);
  }
  return records;
}

export class MockAdapter implements DataSourceAdapter {
  name = "Mock (Demo Data)";

  async getGlucose(range: DateRange): Promise<GlucoseReading[]> {
    return seedGlucose(range);
  }
  async getSleep(range: DateRange): Promise<SleepRecord[]> {
    return seedSleep(range);
  }
  async getLabs(): Promise<LabResult[]> {
    return LABS;
  }
  async getWeight(range: DateRange): Promise<WeightRecord[]> {
    return seedWeight(range);
  }
  async getMeals(range: DateRange): Promise<MealRecord[]> {
    return MEALS.filter((m) => m.timestamp >= range.start && m.timestamp <= range.end);
  }
  async getActivity(range: DateRange): Promise<ActivityRecord[]> {
    return seedActivity(range);
  }
}
