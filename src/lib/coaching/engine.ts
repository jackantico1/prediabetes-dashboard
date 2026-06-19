import type { GlucoseReading, SleepRecord, ActivityRecord, MealRecord } from "../adapters/types";

export interface CoachingAction {
  id: string;
  priority: "high" | "medium" | "low";
  category: "glucose" | "sleep" | "activity" | "meal" | "general";
  title: string;
  detail: string;
  evidence?: string;
  impact: string;
}

export interface HabitStreak {
  habit: string;
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
}

export function generateActions(
  glucose: GlucoseReading[],
  sleep: SleepRecord[],
  activity: ActivityRecord[],
  meals: MealRecord[]
): CoachingAction[] {
  const actions: CoachingAction[] = [];

  // Post-dinner spikes
  const postDinnerReadings = glucose.filter((r) => {
    const h = r.timestamp.getHours();
    return h >= 19 && h <= 22 && r.value > 140;
  });
  if (postDinnerReadings.length > 3) {
    const avg = Math.round(postDinnerReadings.reduce((s, r) => s + r.value, 0) / postDinnerReadings.length);
    actions.push({
      id: "post-dinner-walk",
      priority: "high",
      category: "glucose",
      title: "Take a 15-min walk after dinner",
      detail: `Your post-dinner glucose averages ${avg} mg/dL this week — well above the <140 target.`,
      evidence: `${postDinnerReadings.length} spikes detected after dinner`,
      impact: "Walking after meals can lower post-meal glucose by 20–30 mg/dL.",
    });
  }

  // Poor sleep correlation
  const recentSleep = sleep.slice(-7);
  const poorNights = recentSleep.filter((s) => s.durationHours < 6);
  if (poorNights.length >= 2) {
    actions.push({
      id: "sleep-consistency",
      priority: "high",
      category: "sleep",
      title: "Protect your sleep window",
      detail: `${poorNights.length} nights under 6h this week. Poor sleep raises fasting glucose by 10–15 mg/dL the next morning.`,
      evidence: "Short sleep → cortisol surge → insulin resistance",
      impact: "7–8h sleep is one of the strongest levers for fasting glucose.",
    });
  }

  // Low step count
  const recentActivity = activity.slice(-7);
  const lowStepDays = recentActivity.filter((a) => a.steps < 5000);
  if (lowStepDays.length >= 3) {
    actions.push({
      id: "steps",
      priority: "medium",
      category: "activity",
      title: "Aim for 7,000+ steps daily",
      detail: `You had ${lowStepDays.length} days under 5,000 steps this week. Daily movement improves insulin sensitivity.`,
      evidence: `Average: ${Math.round(recentActivity.reduce((s, a) => s + a.steps, 0) / recentActivity.length).toLocaleString()} steps/day`,
      impact: "Each 1,000 extra steps reduces T2D risk by ~6%.",
    });
  }

  // High-carb meals
  const highCarbMeals = meals.filter((m) => (m.carbsG ?? 0) > 60);
  if (highCarbMeals.length > 0) {
    actions.push({
      id: "carb-awareness",
      priority: "medium",
      category: "meal",
      title: "Front-load protein and fiber at meals",
      detail: "Meals with 60g+ carbs are spiking your CGM. Eating protein/veggies first blunts the glucose rise.",
      evidence: `${highCarbMeals.length} high-carb meal(s) logged recently`,
      impact: "Protein-first eating can cut post-meal spikes by 25–40%.",
    });
  }

  // General HbA1c goal reminder
  actions.push({
    id: "hba1c-goal",
    priority: "low",
    category: "general",
    title: "Track toward HbA1c < 5.7%",
    detail: "Your last HbA1c was 5.9%. Consistent low-spike days add up — each 0.1% drop takes ~3 months of habit change.",
    impact: "Getting below 5.7% reverses the prediabetes diagnosis.",
  });

  return actions.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.priority] - rank[b.priority];
  });
}

export function computeStreaks(activity: ActivityRecord[], sleep: SleepRecord[]): HabitStreak[] {
  const today = new Date().toISOString().slice(0, 10);

  // Post-meal walk streak (proxy: active minutes > 15)
  let walkStreak = 0, walkBest = 0;
  for (let i = activity.length - 1; i >= 0; i--) {
    if (activity[i].activeMinutes >= 15) { walkStreak++; walkBest = Math.max(walkBest, walkStreak); }
    else break;
  }

  // Sleep streak (>= 7h)
  let sleepStreak = 0, sleepBest = 0;
  for (let i = sleep.length - 1; i >= 0; i--) {
    if (sleep[i].durationHours >= 7) { sleepStreak++; sleepBest = Math.max(sleepBest, sleepStreak); }
    else break;
  }

  // Step streak (>= 7000)
  let stepStreak = 0, stepBest = 0;
  for (let i = activity.length - 1; i >= 0; i--) {
    if (activity[i].steps >= 7000) { stepStreak++; stepBest = Math.max(stepBest, stepStreak); }
    else break;
  }

  return [
    { habit: "Post-meal movement", currentStreak: walkStreak, bestStreak: walkBest, completedToday: (activity[activity.length - 1]?.activeMinutes ?? 0) >= 15 },
    { habit: "7+ hours sleep", currentStreak: sleepStreak, bestStreak: sleepBest, completedToday: (sleep[sleep.length - 1]?.durationHours ?? 0) >= 7 },
    { habit: "7,000+ steps", currentStreak: stepStreak, bestStreak: stepBest, completedToday: (activity[activity.length - 1]?.steps ?? 0) >= 7000 },
  ];
}
