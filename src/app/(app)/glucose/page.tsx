import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getUserTimeZone } from "@/lib/time/server";
import { listGlucose, recentGlucose } from "@/lib/repo/glucose";
import { getSettings } from "@/lib/repo/settings";
import { computeGlucoseStats, dailyFastingSeries, fastingStatus, postMealStatus } from "@/lib/glucose/stats";
import { daysAgo } from "@/lib/time";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/dashboard/StatTile";
import { GlucoseQuickAdd } from "@/components/glucose/GlucoseQuickAdd";
import { FastingTrendChart } from "@/components/glucose/FastingTrendChart";
import { ReadingsList } from "@/components/glucose/ReadingsList";

export const metadata = { title: "Glucose" };
export const dynamic = "force-dynamic";

export default async function GlucosePage({ searchParams }: { searchParams: Promise<{ range?: string; log?: string }> }) {
  const user = await requireUser();
  const tz = await getUserTimeZone();
  const sp = await searchParams;
  const rangeDays = sp.range === "90" ? 90 : 30;
  const now = new Date();

  const [settings, readings90, recent] = await Promise.all([
    getSettings(user.id),
    listGlucose(user.id, daysAgo(90, now), now),
    recentGlucose(user.id, 60),
  ]);
  const targets = { fasting: settings.targetFastingMgdl, postMeal: settings.targetPostMealMgdl };
  const readings30 = readings90.filter((r) => r.ts >= daysAgo(30, now));
  const stats = computeGlucoseStats(readings30, targets, now, tz);
  const series = dailyFastingSeries(rangeDays === 90 ? readings90 : readings30, tz);

  return (
    <>
      <PageHeader title="Glucose" subtitle="Fingerstick readings. Fasting readings are the ones to compare day to day." />

      <Card title="Log a reading">
        <GlucoseQuickAdd autoFocus={sp.log === "1"} />
      </Card>

      {stats.total === 0 ? (
        <Card>
          <EmptyState
            icon="🩸"
            title="No readings yet"
            description="Start with a fasting reading tomorrow morning before you eat or drink anything. After a few days you'll see a trend here."
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Fasting · 7-day avg" value={stats.fasting.avg7d} unit="mg/dL" status={stats.fasting.avg7d ? fastingStatus(stats.fasting.avg7d) : "neutral"} emptyText="No fasting readings this week" />
            <StatTile label="Fasting · 30-day avg" value={stats.fasting.avg30d} unit="mg/dL" sub={stats.fasting.count30d ? `${stats.fasting.count30d} readings` : undefined} status={stats.fasting.avg30d ? fastingStatus(stats.fasting.avg30d) : "neutral"} emptyText="No fasting readings yet" />
            <StatTile label="Fasting in target" value={stats.fasting.inTargetPct30d !== null ? `${stats.fasting.inTargetPct30d}%` : null} sub={`Under ${targets.fasting} mg/dL · 30 days`} status={stats.fasting.inTargetPct30d === null ? "neutral" : stats.fasting.inTargetPct30d >= 70 ? "good" : stats.fasting.inTargetPct30d >= 40 ? "warn" : "bad"} emptyText="Needs fasting readings" />
            <StatTile label="After meals · avg" value={stats.postMeal.avg30d} unit="mg/dL" sub={stats.postMeal.count30d ? `${stats.postMeal.count30d} readings · ${stats.postMeal.overTargetPct30d}% over ${targets.postMeal}` : undefined} status={stats.postMeal.avg30d ? postMealStatus(stats.postMeal.avg30d, targets.postMeal) : "neutral"} emptyText="Log a reading 1–2h after eating" />
          </div>

          <Card
            title="Fasting trend"
            subtitle={series.length < 3 ? "Log a few more fasting readings to see a trend." : `Daily fasting readings, last ${rangeDays} days`}
            action={
              <div className="flex gap-1 text-xs">
                {[30, 90].map((n) => (
                  <Link key={n} href={`/glucose?range=${n}`} className={`px-2.5 py-1 rounded-full border ${rangeDays === n ? "bg-slate-800 text-white border-slate-800" : "border-slate-300 text-slate-600"}`}>
                    {n}d
                  </Link>
                ))}
              </div>
            }
          >
            {series.length >= 3 ? (
              <FastingTrendChart data={series} target={targets.fasting} />
            ) : (
              <p className="text-sm text-slate-500">Three or more fasting days needed.</p>
            )}
          </Card>

          <div>
            <h2 className="card-title mb-3">Recent readings</h2>
            <ReadingsList readings={recent} targets={targets} tz={tz} />
          </div>
        </>
      )}
    </>
  );
}
