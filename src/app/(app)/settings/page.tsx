import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/repo/settings";
import { hasDemoData } from "@/lib/demo/seed";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { clearDemo, loadDemo, saveTargets } from "./actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [settings, demo] = await Promise.all([getSettings(user.id), hasDemoData(user.id)]);

  return (
    <>
      <PageHeader title="Settings" subtitle={user.email} action={<SignOutButton />} />

      {sp.saved && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">Targets saved.</p>}
      {sp.error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">Those targets didn&apos;t look right. Please check the ranges.</p>}
      {sp.demo === "cleared" && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">Sample data removed. Your own entries were kept.</p>}

      <Card title="Targets" subtitle="Used for colors, streaks and coaching. Defaults follow common clinical guidance for prediabetes.">
        <form action={saveTargets} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="targetFastingMgdl">Fasting glucose under (mg/dL)</label>
            <input id="targetFastingMgdl" name="targetFastingMgdl" className="input" type="number" min={70} max={130} defaultValue={settings.targetFastingMgdl} />
          </div>
          <div>
            <label className="label" htmlFor="targetPostMealMgdl">After-meal glucose under (mg/dL)</label>
            <input id="targetPostMealMgdl" name="targetPostMealMgdl" className="input" type="number" min={100} max={200} defaultValue={settings.targetPostMealMgdl} />
          </div>
          <div>
            <label className="label" htmlFor="targetSteps">Daily steps</label>
            <input id="targetSteps" name="targetSteps" className="input" type="number" min={1000} max={30000} step={500} defaultValue={settings.targetSteps} />
          </div>
          <div>
            <label className="label" htmlFor="targetSleepHours">Sleep (hours)</label>
            <input id="targetSleepHours" name="targetSleepHours" className="input" type="number" min={5} max={10} step={0.5} defaultValue={settings.targetSleepHours} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Save targets</button>
          </div>
        </form>
      </Card>

      <Card title="Sample data" subtitle="Two months of realistic sample readings, meals, labs, a DEXA scan and wearable data, so you can see the dashboard working. Clearly marked, and removable with one click without touching your own entries.">
        <div id="demo" className="flex flex-wrap gap-3">
          <form action={loadDemo}>
            <button type="submit" className="btn-secondary">{demo ? "Reload sample data" : "Load sample data"}</button>
          </form>
          {demo && (
            <form action={clearDemo}>
              <button type="submit" className="btn-danger">Clear sample data</button>
            </form>
          )}
        </div>
      </Card>
    </>
  );
}
