import { requireUser } from "@/lib/session";
import { getUserTimeZone } from "@/lib/time/server";
import { listMeals } from "@/lib/repo/meals";
import { listGlucose } from "@/lib/repo/glucose";
import { getSettings } from "@/lib/repo/settings";
import { pairMealsWithGlucose } from "@/lib/food/pairing";
import { aiConfigured } from "@/lib/ai/client";
import { daysAgo } from "@/lib/time";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/dashboard/StatTile";
import { MealLogger } from "@/components/food/MealLogger";
import { MealList } from "@/components/food/MealList";

export const metadata = { title: "Food" };
export const dynamic = "force-dynamic";

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ log?: string }> }) {
  const user = await requireUser();
  const tz = await getUserTimeZone();
  const sp = await searchParams;
  const now = new Date();
  const [settings, mealRows, readings] = await Promise.all([
    getSettings(user.id),
    listMeals(user.id, daysAgo(30, now), now),
    listGlucose(user.id, daysAgo(31, now), now),
  ]);
  const meals = pairMealsWithGlucose(mealRows, readings);
  const measured = meals.filter((m) => m.response?.rise != null);
  const avgRise = measured.length ? Math.round(measured.reduce((s, m) => s + (m.response!.rise as number), 0) / measured.length) : null;
  const withCarbs = mealRows.filter((m) => m.carbsG != null);
  const avgCarbs = withCarbs.length ? Math.round(withCarbs.reduce((s, m) => s + (m.carbsG ?? 0), 0) / withCarbs.length) : null;
  // Group repeated meals by description so the list shows distinct foods, ranked by average rise.
  const byFood = new Map<string, { description: string; carbsG: number | null; rises: number[] }>();
  for (const m of measured) {
    const key = m.description.trim().toLowerCase();
    const g = byFood.get(key) ?? { description: m.description, carbsG: m.carbsG, rises: [] };
    g.rises.push(m.response!.rise as number);
    byFood.set(key, g);
  }
  const biggest = [...byFood.values()]
    .map((g) => ({ ...g, avgRise: Math.round(g.rises.reduce((s, r) => s + r, 0) / g.rises.length), count: g.rises.length }))
    .sort((a, b) => b.avgRise - a.avgRise)
    .slice(0, 3);

  return (
    <>
      <PageHeader title="Food" subtitle="Describe what you ate. Pair it with a before and after reading to see what actually spikes you." />

      <Card title="Log a meal">
        <MealLogger aiEnabled={aiConfigured()} autoFocus={sp.log === "1"} />
      </Card>

      {meals.length === 0 ? (
        <Card>
          <EmptyState icon="🥗" title="No meals logged yet" description="Log a meal, then a glucose reading 1–2 hours later. After a handful of meals you'll see which ones move your numbers." />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Meals logged" value={mealRows.length} sub="Last 30 days" />
            <StatTile label="Avg carbs per meal" value={avgCarbs} unit="g" status={avgCarbs === null ? "neutral" : avgCarbs <= 45 ? "good" : avgCarbs <= 65 ? "warn" : "bad"} emptyText="Add macros to see this" />
            <StatTile label="Avg glucose rise" value={avgRise !== null ? `+${avgRise}` : null} unit="mg/dL" sub={measured.length ? `${measured.length} meals with before & after readings` : undefined} status={avgRise === null ? "neutral" : avgRise < 30 ? "good" : avgRise < 50 ? "warn" : "bad"} emptyText="Pair a meal with readings" />
            <StatTile label="Biggest spike" value={biggest[0] ? `+${biggest[0].avgRise}` : null} unit="mg/dL" sub={biggest[0] ? biggest[0].description.slice(0, 40) : undefined} status={biggest[0] ? "warn" : "neutral"} emptyText="Needs paired readings" />
          </div>

          {biggest.length >= 2 && (
            <Card title="Meals that spike you most" subtitle="Highest glucose rise, last 30 days. These are the ones worth tweaking first.">
              <ol className="space-y-2">
                {biggest.map((m, i) => (
                  <li key={m.description} className="flex items-center gap-3 text-sm">
                    <span className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <span className="flex-1 text-slate-800 truncate">{m.description}{m.count > 1 && <span className="text-slate-400"> · {m.count}×</span>}</span>
                    <span className="text-slate-500 text-xs tabular-nums whitespace-nowrap">{m.carbsG != null ? `${Math.round(m.carbsG)}g carbs · ` : ""}+{m.avgRise} mg/dL</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <div>
            <h2 className="card-title mb-3">Recent meals</h2>
            <MealList meals={meals} postMealTarget={settings.targetPostMealMgdl} tz={tz} />
          </div>
        </>
      )}
    </>
  );
}
