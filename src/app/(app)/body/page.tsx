import { requireUser } from "@/lib/session";
import { getUserTimeZone } from "@/lib/time/server";
import { listWeight, latestWeight } from "@/lib/repo/weight";
import { listDexa } from "@/lib/repo/dexa";
import { aiConfigured } from "@/lib/ai/client";
import { localDate, shiftDate, formatShortDate } from "@/lib/time";
import { chart } from "@/lib/charts/theme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/dashboard/StatTile";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { WeightQuickAdd } from "@/components/body/WeightQuickAdd";
import { DexaUpload } from "@/components/body/DexaUpload";
import { DexaHistory } from "@/components/body/DexaHistory";

export const metadata = { title: "Body" };
export const dynamic = "force-dynamic";

export default async function BodyPage({ searchParams }: { searchParams: Promise<{ log?: string }> }) {
  const user = await requireUser();
  const tz = await getUserTimeZone();
  const sp = await searchParams;
  const today = localDate(new Date(), tz);
  const [weights, latest, scans] = await Promise.all([listWeight(user.id, shiftDate(today, -90)), latestWeight(user.id), listDexa(user.id)]);

  // One point per day (prefer manual over synced/imported when both exist).
  const byDay = new Map<string, number>();
  for (const w of [...weights].reverse()) if (!byDay.has(w.date) || w.source === "manual") byDay.set(w.date, w.weightLbs);
  const series = [...byDay.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
  const first = series[0];
  const last = series.at(-1);
  const change = first && last && first.date !== last.date ? +(last.value - first.value).toFixed(1) : null;

  const latestScan = scans[0] ?? null;
  const prevScan = scans[1] ?? null;
  const delta = (k: "totalBodyFatPct" | "visceralFatLbs" | "leanMassLbs") =>
    latestScan && prevScan && latestScan[k] != null && prevScan[k] != null ? +((latestScan[k] as number) - (prevScan[k] as number)).toFixed(2) : null;
  const fmtDelta = (d: number | null, unit: string) => (d === null ? undefined : `${d > 0 ? "+" : ""}${d}${unit} vs previous scan`);

  return (
    <>
      <PageHeader title="Body" subtitle="Weight for the trend, DEXA for what's under it. Visceral fat is the number that matters most for insulin resistance." />

      <Card title="Log weight">
        <WeightQuickAdd autoFocus={sp.log === "1"} lastWeight={latest?.weightLbs} />
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Weight" value={latest?.weightLbs} unit="lbs" sub={latest ? formatShortDate(latest.date) : undefined} emptyText="No weight yet" />
        <StatTile label="90-day change" value={change !== null ? `${change > 0 ? "+" : ""}${change}` : null} unit="lbs" sub={first && last ? `${formatShortDate(first.date)} → ${formatShortDate(last.date)}` : undefined} status={change === null ? "neutral" : change <= 0 ? "good" : "warn"} emptyText="Needs two weigh-ins" />
        <StatTile label="Body fat" value={latestScan?.totalBodyFatPct != null ? `${latestScan.totalBodyFatPct}%` : latest?.bodyFatPct != null ? `${latest.bodyFatPct}%` : null} sub={latestScan?.totalBodyFatPct != null ? fmtDelta(delta("totalBodyFatPct"), "%") ?? `DEXA · ${formatShortDate(latestScan.date)}` : latest?.bodyFatPct != null ? "From scale" : undefined} status={delta("totalBodyFatPct") === null ? "neutral" : (delta("totalBodyFatPct") as number) <= 0 ? "good" : "warn"} emptyText="Add a DEXA scan" />
        <StatTile label="Visceral fat" value={latestScan?.visceralFatLbs != null ? `${+latestScan.visceralFatLbs.toFixed(2)}` : null} unit="lbs" sub={fmtDelta(delta("visceralFatLbs"), " lbs") ?? (latestScan?.visceralFatAreaCm2 != null ? `${Math.round(latestScan.visceralFatAreaCm2)} cm² · under 100 is ideal` : undefined)} status={latestScan?.visceralFatLbs == null ? "neutral" : latestScan.visceralFatLbs < 1.5 ? "good" : latestScan.visceralFatLbs < 3 ? "warn" : "bad"} emptyText="Add a DEXA scan" />
      </div>

      <Card title="Weight · last 90 days" subtitle={series.length < 2 ? "Log a couple of weigh-ins to see the trend." : undefined}>
        {series.length >= 2 ? <TrendLineChart data={series} unit="lbs" decimals={1} /> : <p className="text-sm text-slate-500">Not enough data yet.</p>}
      </Card>

      <Card title="DEXA scans" subtitle="Body composition from a DEXA (DXA) scan. One every 3–6 months is plenty.">
        <DexaUpload aiEnabled={aiConfigured()} />
        {scans.length > 0 ? (
          <div className="mt-6 space-y-6">
            {scans.filter((s) => s.visceralFatLbs != null).length >= 2 && (
              <div>
                <h3 className="card-title mb-2">Visceral fat over time</h3>
                <TrendLineChart data={scans.filter((s) => s.visceralFatLbs != null).map((s) => ({ date: s.date, value: s.visceralFatLbs as number })).reverse()} unit="lbs" decimals={2} color={chart.series2} height={180} />
              </div>
            )}
            <DexaHistory scans={scans} />
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon="🦴" title="No scans yet" description="A DEXA scan breaks weight into fat, lean mass and visceral fat. Upload the report and we'll pull the numbers out for you." />
          </div>
        )}
      </Card>
    </>
  );
}
