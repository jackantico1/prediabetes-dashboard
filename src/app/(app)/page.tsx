import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getUserTimeZone } from "@/lib/time/server";
import { loadDashboard } from "@/lib/dashboard/load";
import { fastingStatus } from "@/lib/glucose/stats";
import { formatShortDate } from "@/lib/time";
import { StatTile } from "@/components/dashboard/StatTile";
import { QuickLogRow } from "@/components/dashboard/QuickLogRow";
import { OnboardingCard } from "@/components/dashboard/OnboardingCard";
import { ActionList, Streaks } from "@/components/dashboard/CoachingPanel";
import { FastingTrendChart } from "@/components/glucose/FastingTrendChart";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const tz = await getUserTimeZone();
  const d = await loadDashboard(user.id, tz);
  const firstName = user.name.split(" ")[0];
  const showOnboarding = !d.settings.onboardingDone && (d.counts.readings === 0 || d.counts.labs === 0);

  const trendText = { improving: "improving", steady: "holding steady", worsening: "creeping up" } as const;
  const a1cDelta = d.a1c?.previous ? +(d.a1c.latest.value - d.a1c.previous.value).toFixed(1) : null;

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hi, {firstName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz })}
        </p>
      </div>

      {showOnboarding && <OnboardingCard hasReadings={d.counts.readings > 0} hasLabs={d.counts.labs > 0} hasGarmin={d.garminConnected} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Fasting glucose"
          value={d.stats.fasting.avg7d ?? d.stats.fasting.latest?.value}
          unit="mg/dL"
          sub={
            d.stats.fasting.avg7d
              ? `7-day avg${d.stats.fasting.trend ? ` · ${trendText[d.stats.fasting.trend]}` : ""}`
              : d.stats.fasting.latest
                ? "Latest reading"
                : undefined
          }
          status={d.stats.fasting.avg7d ? fastingStatus(d.stats.fasting.avg7d) : d.stats.fasting.latest ? fastingStatus(d.stats.fasting.latest.value) : "neutral"}
          href="/glucose"
          emptyText="No readings yet"
          emptyCta="Log one"
        />
        <StatTile
          label="HbA1c"
          value={d.a1c ? `${d.a1c.latest.value}%` : null}
          sub={d.a1c ? `${formatShortDate(d.a1c.latest.date)}${a1cDelta !== null ? ` · ${a1cDelta > 0 ? "+" : ""}${a1cDelta} vs previous` : ""}` : undefined}
          status={d.a1c ? (d.a1c.latest.value < 5.7 ? "good" : d.a1c.latest.value < 6.5 ? "warn" : "bad") : "neutral"}
          href="/labs"
          emptyText="No labs yet"
          emptyCta="Upload a PDF"
        />
        <StatTile
          label="Weight"
          value={d.weight?.weightLbs}
          unit="lbs"
          sub={d.weightChange30d !== null ? `${d.weightChange30d > 0 ? "+" : ""}${d.weightChange30d} lbs in 30 days` : d.weight ? formatShortDate(d.weight.date) : undefined}
          status={d.weightChange30d === null ? "neutral" : d.weightChange30d <= 0 ? "good" : "warn"}
          href="/body"
          emptyText="No weight yet"
          emptyCta="Log it"
        />
        <StatTile
          label="Last night's sleep"
          value={d.lastNight?.sleepHours != null ? `${d.lastNight.sleepHours}h` : null}
          sub={d.lastNight ? [d.lastNight.sleepScore != null ? `Score ${d.lastNight.sleepScore}` : null, d.lastNight.hrvMs != null ? `HRV ${d.lastNight.hrvMs} ms` : null, d.todayHealth?.steps != null ? `${d.todayHealth.steps.toLocaleString()} steps today` : null].filter(Boolean).join(" · ") : undefined}
          status={d.lastNight?.sleepHours == null ? "neutral" : d.lastNight.sleepHours >= d.settings.targetSleepHours ? "good" : d.lastNight.sleepHours >= 6 ? "warn" : "bad"}
          href="/activity"
          emptyText={d.garminConnected ? "Not synced yet" : "Connect Garmin"}
          emptyCta={d.garminConnected ? "Sync now" : "Set up"}
        />
      </div>

      <QuickLogRow />

      {d.actions.length > 0 && (
        <Card title="Your plan this week" subtitle="Based on your own numbers. Tap one to see why it matters." action={d.actions.length > 3 ? <Link href="/glucose#plan" className="text-sm text-teal-700 font-medium whitespace-nowrap">All {d.actions.length}</Link> : undefined}>
          <ActionList actions={d.actions} limit={3} />
          {d.streaks.length > 0 && (
            <div className="mt-6">
              <h3 className="card-title mb-3">Streaks</h3>
              <Streaks streaks={d.streaks} />
            </div>
          )}
        </Card>
      )}

      {d.fastingSeries.length >= 3 && (
        <Card title="Fasting glucose · last 30 days" action={<Link href="/glucose" className="text-sm text-teal-700 font-medium">Details</Link>}>
          <FastingTrendChart data={d.fastingSeries} target={d.settings.targetFastingMgdl} height={220} />
        </Card>
      )}
    </>
  );
}
