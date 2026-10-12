import type { DailyHealth, GlucoseReading, LabResult, UserSettings } from "@/db/schema";
import { localDate, shiftDate } from "@/lib/time";
import type { GlucoseStats } from "@/lib/glucose/stats";
import type { MealWithResponse } from "@/lib/food/pairing";

export interface CoachingAction {
  id: string;
  priority: "high" | "medium" | "low";
  category: "glucose" | "sleep" | "activity" | "meal" | "labs" | "logging";
  title: string;
  detail: string;
  evidence?: string;
  why: string;
}

export interface HabitStreak {
  id: string;
  habit: string;
  currentStreak: number;
  completedToday: boolean;
}

export interface CoachingInput {
  stats: GlucoseStats;
  readings: GlucoseReading[]; // last 30 days
  meals: MealWithResponse[]; // last 14 days, paired with glucose
  health: DailyHealth[]; // last 30 days, any order
  labs: LabResult[];
  settings: UserSettings;
  today: string; // yyyy-MM-dd in user's tz
}

const RANK = { high: 0, medium: 1, low: 2 };

/**
 * Rule-based coaching. Every rule checks that its own data exists before speaking,
 * so a brand-new user sees nothing invented. Returns actions sorted by priority.
 */
export function generateActions(input: CoachingInput): CoachingAction[] {
  const { stats, meals, health, labs, settings } = input;
  const actions: CoachingAction[] = [];
  const recentHealth = [...health].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);

  // --- Fasting glucose -----------------------------------------------------
  if (stats.fasting.count30d >= 5 && stats.fasting.avg30d !== null) {
    const a = stats.fasting.avg30d;
    if (a >= settings.targetFastingMgdl) {
      actions.push({
        id: "fasting-high",
        priority: a >= 110 ? "high" : "medium",
        category: "glucose",
        title: "Bring fasting glucose down",
        detail: `Your fasting average over 30 days is ${a} mg/dL (target under ${settings.targetFastingMgdl}).`,
        evidence: `${stats.fasting.count30d} fasting readings · ${stats.fasting.inTargetPct30d}% in target${stats.fasting.trend ? ` · trend ${stats.fasting.trend}` : ""}`,
        why: "Fasting glucose reflects overnight liver output and insulin sensitivity. The biggest levers are an earlier, lighter dinner, 7+ hours of sleep, and a short walk after dinner.",
      });
    } else if (stats.fasting.trend === "improving") {
      actions.push({
        id: "fasting-improving",
        priority: "low",
        category: "glucose",
        title: "Fasting glucose is heading the right way",
        detail: `30-day fasting average is ${a} mg/dL and the last two weeks are lower than the two before.`,
        why: "Consistency matters more than any single reading. Keep the routine that got you here.",
      });
    }
  }

  // --- Post-meal spikes ----------------------------------------------------
  const paired = meals.filter((m) => m.response?.rise !== undefined && m.response.rise !== null);
  const spikes = paired.filter((m) => (m.response!.rise as number) >= 40 || (m.response!.peak ?? 0) > settings.targetPostMealMgdl);
  if (paired.length >= 3 && spikes.length >= 2) {
    const worst = [...spikes].sort((a, b) => (b.response!.rise ?? 0) - (a.response!.rise ?? 0))[0];
    actions.push({
      id: "post-meal-walk",
      priority: "high",
      category: "meal",
      title: "Walk 10–15 minutes after your biggest meal",
      detail: `${spikes.length} of your last ${paired.length} measured meals pushed glucose above ${settings.targetPostMealMgdl} or rose 40+ mg/dL.`,
      evidence: worst ? `Largest: "${truncate(worst.description, 40)}" rose ${worst.response!.rise} mg/dL` : undefined,
      why: "Muscles take up glucose without insulin while moving. A short walk right after eating typically trims the peak by 20–30 mg/dL.",
    });
  } else if (stats.postMeal.count30d >= 4 && (stats.postMeal.overTargetPct30d ?? 0) >= 50) {
    actions.push({
      id: "post-meal-high",
      priority: "medium",
      category: "glucose",
      title: "After-meal readings are running high",
      detail: `${stats.postMeal.overTargetPct30d}% of your after-meal readings this month were above ${settings.targetPostMealMgdl} mg/dL.`,
      why: "Pairing a before and after reading with what you ate shows which meals drive the spikes, so you can change the meal rather than guess.",
    });
  }

  // --- Carbs ---------------------------------------------------------------
  const carbHeavy = meals.filter((m) => (m.carbsG ?? 0) >= 60);
  if (meals.length >= 3 && carbHeavy.length >= 2) {
    actions.push({
      id: "carb-order",
      priority: "medium",
      category: "meal",
      title: "Eat protein and vegetables first",
      detail: `${carbHeavy.length} meals in the last two weeks had 60g+ of carbs.`,
      evidence: carbHeavy[0] ? `e.g. "${truncate(carbHeavy[0].description, 40)}" (${Math.round(carbHeavy[0].carbsG!)}g carbs)` : undefined,
      why: "Sequencing protein and fiber before starches slows glucose absorption and can cut the post-meal rise by a quarter or more without eating less.",
    });
  }

  // --- Sleep ---------------------------------------------------------------
  const sleepNights = recentHealth.filter((h) => h.sleepHours != null);
  const shortNights = sleepNights.filter((h) => (h.sleepHours ?? 0) < settings.targetSleepHours);
  if (sleepNights.length >= 4 && shortNights.length >= 2) {
    actions.push({
      id: "sleep",
      priority: shortNights.length >= 4 ? "high" : "medium",
      category: "sleep",
      title: "Protect your sleep window",
      detail: `${shortNights.length} of the last ${sleepNights.length} nights were under ${settings.targetSleepHours} hours.`,
      evidence: `Average ${(sleepNights.reduce((s, h) => s + (h.sleepHours ?? 0), 0) / sleepNights.length).toFixed(1)}h`,
      why: "One short night raises next-morning fasting glucose and makes you more insulin resistant the following day. Sleep is one of the cheapest levers you have.",
    });
  }

  // --- Steps ---------------------------------------------------------------
  const stepDays = recentHealth.filter((h) => h.steps != null);
  const lowDays = stepDays.filter((h) => (h.steps ?? 0) < Math.round(settings.targetSteps * 0.7));
  if (stepDays.length >= 5 && lowDays.length >= 3) {
    const avgSteps = Math.round(stepDays.reduce((s, h) => s + (h.steps ?? 0), 0) / stepDays.length);
    actions.push({
      id: "steps",
      priority: "medium",
      category: "activity",
      title: `Aim for ${settings.targetSteps.toLocaleString()} steps most days`,
      detail: `${lowDays.length} of the last ${stepDays.length} days were well below your step target.`,
      evidence: `Average ${avgSteps.toLocaleString()} steps/day`,
      why: "Daily movement improves insulin sensitivity for up to 48 hours. Spreading steps through the day beats one long session.",
    });
  }

  // --- Labs ----------------------------------------------------------------
  const a1c = labs.filter((l) => l.marker === "HbA1c").sort((a, b) => b.date.localeCompare(a.date));
  if (a1c.length) {
    const latest = a1c[0];
    const prev = a1c[1];
    const delta = prev ? +(latest.value - prev.value).toFixed(1) : null;
    const dir = delta === null ? "" : delta < 0 ? ` That is down ${Math.abs(delta)} from your previous test.` : delta > 0 ? ` That is up ${delta} from your previous test.` : " Unchanged from your previous test.";
    if (latest.value >= 5.7) {
      actions.push({
        id: "a1c",
        priority: "low",
        category: "labs",
        title: "Track toward HbA1c under 5.7%",
        detail: `Your latest HbA1c was ${latest.value}%.${dir}`,
        why: "HbA1c averages about three months of glucose. Each 0.1% drop usually takes several weeks of lower daily readings, so day-to-day habits show up here with a delay.",
      });
    } else {
      actions.push({
        id: "a1c-normal",
        priority: "low",
        category: "labs",
        title: "HbA1c is in the normal range",
        detail: `Your latest HbA1c was ${latest.value}%.${dir}`,
        why: "Below 5.7% is the non-diabetic range. Keep the habits that got you here and re-test in 3–6 months.",
      });
    }
  }

  // --- Logging habits ------------------------------------------------------
  if (stats.total > 0 && stats.fasting.daysLogged7d < 3) {
    actions.push({
      id: "log-fasting",
      priority: "medium",
      category: "logging",
      title: "Log a fasting reading most mornings",
      detail: `You logged fasting glucose on ${stats.fasting.daysLogged7d} of the last 7 days.`,
      why: "Fasting readings are the most comparable number day to day. Four or more a week is enough to see a real trend.",
    });
  }

  return actions.sort((a, b) => RANK[a.priority] - RANK[b.priority]);
}

export function computeStreaks(input: Pick<CoachingInput, "readings" | "health" | "settings" | "today">, tz: string): HabitStreak[] {
  const { readings, health, settings, today } = input;
  const streaks: HabitStreak[] = [];

  // Fasting reading logged (streak may end today or yesterday without breaking)
  const fastingDays = new Set(readings.filter((r) => r.tag === "fasting").map((r) => localDate(r.ts, tz)));
  if (readings.length) {
    streaks.push({
      id: "log",
      habit: "Fasting reading logged",
      currentStreak: countStreak((d) => fastingDays.has(d), today),
      completedToday: fastingDays.has(today),
    });
  }

  const byDate = new Map(health.map((h) => [h.date, h]));
  if (health.some((h) => h.steps != null)) {
    const hit = (d: string) => (byDate.get(d)?.steps ?? 0) >= settings.targetSteps;
    streaks.push({ id: "steps", habit: `${settings.targetSteps.toLocaleString()}+ steps`, currentStreak: countStreak(hit, today), completedToday: hit(today) });
  }
  if (health.some((h) => h.sleepHours != null)) {
    const hit = (d: string) => (byDate.get(d)?.sleepHours ?? 0) >= settings.targetSleepHours;
    streaks.push({ id: "sleep", habit: `${settings.targetSleepHours}+ hours sleep`, currentStreak: countStreak(hit, today), completedToday: hit(today) });
  }
  return streaks;
}

/** Consecutive days satisfying `hit`, counting back from today, or from yesterday if today isn't done yet. */
function countStreak(hit: (date: string) => boolean, today: string): number {
  let d = hit(today) ? today : shiftDate(today, -1);
  let n = 0;
  while (hit(d) && n < 365) {
    n++;
    d = shiftDate(d, -1);
  }
  return n;
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
