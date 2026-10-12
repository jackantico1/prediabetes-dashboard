import { requireUser } from "@/lib/session";
import { getUserTimeZone } from "@/lib/time/server";
import { listDailyHealth } from "@/lib/repo/dailyHealth";
import { getGarminConnection } from "@/lib/repo/garmin";
import { getSettings } from "@/lib/repo/settings";
import { garminAvailable } from "@/lib/garmin/sync";
import { localDate, shiftDate } from "@/lib/time";
import { chart } from "@/lib/charts/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/dashboard/StatTile";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { DailyBarChart } from "@/components/activity/ActivityCharts";
import { GarminCard } from "@/components/activity/GarminCard";

export const metadata = { title: "Activity & sleep" };
export const dynamic = "force-dynamic";

const avg = (xs: (number | null | undefined)[], d = 0) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(d) : null;
};

export default async function ActivityPage() {
  const user = await requireUser();
  const tz = await getUserTimeZone();
  const today = localDate(new Date(), tz);
  const [settings, health, conn] = await Promise.all([getSettings(user.id), listDailyHealth(user.id, shiftDate(today, -30)), getGarminConnection(user.id)]);
  const asc = [...health].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = asc.slice(-7);
  const series = (key: "steps" | "sleepHours" | "hrvMs" | "restingHr") => asc.filter((h) => h[key] != null).map((h) => ({ date: h.date, value: h[key] as number }));

  const steps7 = avg(last7.map((h) => h.steps));
  const sleep7 = avg(last7.map((h) => h.sleepHours), 1);
  const hrv7 = avg(last7.map((h) => h.hrvMs));
  const rhr7 = avg(last7.map((h) => h.restingHr));
  const stepDays = last7.filter((h) => (h.steps ?? 0) >= settings.targetSteps).length;

  return (
    <>
      <PageHeader title="Activity & sleep" subtitle="From your Garmin watch. Sleep and daily movement are two of the biggest levers on fasting glucose." />

      <Card title="Garmin">
        <GarminCard
          available={garminAvailable()}
          connection={conn ? { displayName: conn.garminDisplayName, email: conn.garminEmail, status: conn.status, lastSyncAt: conn.lastSyncAt?.toISOString() ?? null, lastError: conn.lastError } : null}
        />
      </Card>

      {health.length === 0 ? (
        <Card>
          <EmptyState icon="🏃" title="No activity or sleep data yet" description={conn ? "Press Sync now to pull the last 30 days from Garmin." : "Connect Garmin above, or load sample data from Settings to see how this page looks."} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Steps · 7-day avg" value={steps7?.toLocaleString()} sub={`${stepDays} of ${last7.length} days hit ${settings.targetSteps.toLocaleString()}`} status={steps7 === null ? "neutral" : steps7 >= settings.targetSteps ? "good" : steps7 >= settings.targetSteps * 0.7 ? "warn" : "bad"} emptyText="No step data" />
            <StatTile label="Sleep · 7-day avg" value={sleep7 !== null ? `${sleep7}h` : null} status={sleep7 === null ? "neutral" : sleep7 >= settings.targetSleepHours ? "good" : sleep7 >= 6 ? "warn" : "bad"} emptyText="No sleep data" />
            <StatTile label="HRV · 7-day avg" value={hrv7} unit="ms" sub="Higher is better; watch the trend, not one night" emptyText="No HRV data" />
            <StatTile label="Resting HR · 7-day avg" value={rhr7} unit="bpm" sub="Drops as fitness improves" emptyText="No HR data" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Steps · last 30 days">
              <DailyBarChart data={series("steps")} unit="steps" target={settings.targetSteps} />
            </Card>
            <Card title="Sleep · last 30 days">
              <TrendLineChart data={series("sleepHours")} unit="h" decimals={1} color={chart.series3} refLines={[{ y: settings.targetSleepHours, label: `goal ${settings.targetSleepHours}h` }]} height={200} />
            </Card>
            {series("hrvMs").length >= 3 && (
              <Card title="HRV · last 30 days" subtitle="Overnight average. Low nights often follow alcohol, late meals or illness.">
                <TrendLineChart data={series("hrvMs")} unit="ms" color={chart.series1} height={200} />
              </Card>
            )}
            {series("restingHr").length >= 3 && (
              <Card title="Resting heart rate · last 30 days">
                <TrendLineChart data={series("restingHr")} unit="bpm" color={chart.series2} height={200} />
              </Card>
            )}
          </div>
        </>
      )}
    </>
  );
}
