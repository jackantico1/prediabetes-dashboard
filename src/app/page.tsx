import { subDays } from "date-fns";
import { MockAdapter } from "@/lib/adapters/mock";
import { generateActions, computeStreaks } from "@/lib/coaching/engine";
import { StatusBanner } from "@/components/dashboard/StatusBanner";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { GlucoseChart } from "@/components/dashboard/GlucoseChart";
import { CoachingPanel } from "@/components/dashboard/CoachingPanel";
import { WeeklyCorrelation } from "@/components/dashboard/WeeklyCorrelation";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const adapter = new MockAdapter();
  const now = new Date();
  const week = { start: subDays(now, 7), end: now };
  const day = { start: subDays(now, 1), end: now };

  const [glucose7d, sleep7d, weight7d, meals7d, activity7d] = await Promise.all([
    adapter.getGlucose(week),
    adapter.getSleep(week),
    adapter.getWeight(week),
    adapter.getMeals(week),
    adapter.getActivity(week),
  ]);

  const glucose24h = await adapter.getGlucose(day);
  const labs = await adapter.getLabs();

  const avgGlucose = Math.round(glucose7d.reduce((s, r) => s + r.value, 0) / glucose7d.length);
  const inRange = glucose7d.filter((r) => r.value >= 70 && r.value <= 140).length;
  const timeInRange = Math.round((inRange / glucose7d.length) * 100);
  const estHba1c = parseFloat(((avgGlucose + 46.7) / 28.7).toFixed(1));
  const trend: "improving" | "flat" | "worsening" =
    estHba1c < 5.7 ? "improving" : estHba1c < 6.0 ? "flat" : "worsening";

  const latestFasting = glucose7d.find((r) => r.mealTag === "fasting")?.value ?? 0;
  const labHba1c = labs.find((l) => l.marker === "HbA1c")?.value ?? estHba1c;
  const latestSleep = sleep7d[sleep7d.length - 1];
  const latestWeight = weight7d[weight7d.length - 1];

  const mean = avgGlucose;
  const sd = Math.round(Math.sqrt(glucose7d.reduce((s, r) => s + Math.pow(r.value - mean, 2), 0) / glucose7d.length));

  const weeklyData = sleep7d.map((s, i) => {
    const dayGlucose = glucose7d.filter((r) => format(r.timestamp, "yyyy-MM-dd") === s.date);
    const dayAvg = dayGlucose.length
      ? Math.round(dayGlucose.reduce((acc, r) => acc + r.value, 0) / dayGlucose.length)
      : avgGlucose;
    return {
      day: format(new Date(s.date), "EEE"),
      avgGlucose: dayAvg,
      sleepHours: s.durationHours,
      steps: activity7d[i]?.steps ?? 0,
    };
  });

  const actions = generateActions(glucose7d, sleep7d, activity7d, meals7d);
  const streaks = computeStreaks(activity7d, sleep7d);

  return { avgGlucose, timeInRange, estHba1c, labHba1c, trend, latestFasting, latestSleep, latestWeight, sd, glucose24h, weeklyData, actions, streaks, labs };
}

export default async function Dashboard() {
  const d = await getDashboardData();

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Prediabetes Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {format(new Date(), "EEEE, MMMM d, yyyy")} · Demo data
            </p>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">MockAdapter</span>
        </div>

        <StatusBanner hba1c={d.labHba1c} avgGlucose={d.avgGlucose} timeInRange={d.timeInRange} trend={d.trend} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Fasting Glucose" value={`${d.latestFasting} mg/dL`} sub="Latest reading" status={d.latestFasting < 100 ? "good" : d.latestFasting < 126 ? "warn" : "bad"} icon="🩸" />
          <MetricCard label="Glucose Variability" value={`±${d.sd} mg/dL`} sub="Std deviation, 7d" status={d.sd < 20 ? "good" : d.sd < 35 ? "warn" : "bad"} icon="📊" />
          <MetricCard label="Sleep Last Night" value={`${d.latestSleep?.durationHours ?? "—"}h`} sub={d.latestSleep ? `HRV ${d.latestSleep.hrv} ms · Score ${d.latestSleep.score}` : "No data"} status={!d.latestSleep ? "neutral" : d.latestSleep.durationHours >= 7 ? "good" : d.latestSleep.durationHours >= 6 ? "warn" : "bad"} icon="🌙" />
          <MetricCard label="Weight" value={`${d.latestWeight?.weightLbs ?? "—"} lbs`} sub={d.latestWeight ? `Body fat ${d.latestWeight.bodyFatPct}%` : "No data"} status="neutral" icon="⚖️" />
        </div>

        <GlucoseChart readings={d.glucose24h} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WeeklyCorrelation data={d.weeklyData} />
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Lab Markers</h2>
            {[
              { marker: "HbA1c", value: "5.9%", prev: "6.1%", good: false },
              { marker: "Fasting Glucose", value: "107 mg/dL", prev: "112 mg/dL", good: false },
              { marker: "Fasting Insulin", value: "11.2 µIU/mL", prev: "—", good: false },
              { marker: "hs-CRP", value: "1.8 mg/L", prev: "—", good: false },
              { marker: "Omega-3 Index", value: "4.8%", prev: "—", good: false },
              { marker: "HDL", value: "44 mg/dL", prev: "—", good: true },
            ].map((l) => (
              <div key={l.marker} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{l.marker}</span>
                <div className="flex items-center gap-2">
                  {l.prev !== "—" && <span className="text-xs text-slate-400 line-through">{l.prev}</span>}
                  <span className={`font-semibold ${l.good ? "text-emerald-600" : "text-red-500"}`}>{l.value}</span>
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">Last drawn: Mar 10, 2026 · Function Health</p>
          </div>
        </div>

        <CoachingPanel actions={d.actions} streaks={d.streaks} />

        <p className="text-center text-xs text-slate-400 pb-4">
          For personal tracking and education only. This is not medical advice. Always consult your healthcare provider.
        </p>
      </div>
    </main>
  );
}
