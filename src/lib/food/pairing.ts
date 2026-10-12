import type { GlucoseReading, Meal } from "@/db/schema";

export interface GlucoseResponse {
  before: GlucoseReading | null;
  after: GlucoseReading[]; // readings 45 min – 3 h after, sorted by time
  peak: number | null;
  rise: number | null; // peak - before, when both exist
}

export type MealWithResponse = Meal & { response: GlucoseResponse | null };

const BEFORE_WINDOW_MS = 45 * 60_000;
const AFTER_MIN_MS = 45 * 60_000;
const AFTER_MAX_MS = 3 * 60 * 60_000;

/**
 * Attaches the glucose readings that bracket each meal. A reading tagged `before_meal`
 * within 45 min before (or any reading within 20 min before) counts as the baseline;
 * readings between 45 min and 3 h after count as the response. Explicit `mealId` links win.
 */
export function pairMealsWithGlucose(meals: Meal[], readings: GlucoseReading[]): MealWithResponse[] {
  const sorted = [...readings].sort((a, b) => a.ts.getTime() - b.ts.getTime());
  return meals.map((meal) => {
    const t = meal.ts.getTime();
    const linked = sorted.filter((r) => r.mealId === meal.id);

    let before: GlucoseReading | null =
      linked.find((r) => r.tag === "before_meal" || r.ts.getTime() <= t) ?? null;
    if (!before) {
      const candidates = sorted.filter((r) => {
        const dt = t - r.ts.getTime();
        if (dt < 0 || dt > BEFORE_WINDOW_MS) return false;
        return r.tag === "before_meal" || r.tag === "fasting" || dt <= 20 * 60_000;
      });
      before = candidates.at(-1) ?? null;
    }

    const after = sorted.filter((r) => {
      if (r.mealId === meal.id && r.tag === "after_meal") return true;
      if (r.mealId && r.mealId !== meal.id) return false;
      const dt = r.ts.getTime() - t;
      return dt >= AFTER_MIN_MS && dt <= AFTER_MAX_MS && r.tag !== "fasting" && r.tag !== "before_meal";
    });

    if (!before && !after.length) return { ...meal, response: null };
    const peak = after.length ? Math.max(...after.map((r) => r.valueMgdl)) : null;
    const rise = before && peak !== null ? peak - before.valueMgdl : null;
    return { ...meal, response: { before, after, peak, rise } };
  });
}
