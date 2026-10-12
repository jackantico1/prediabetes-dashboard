import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/repo/settings";
import { hasDemoData } from "@/lib/demo/seed";
import { getGarminConnection } from "@/lib/repo/garmin";
import { garminAvailable } from "@/lib/garmin/sync";
import { aiConfigured } from "@/lib/ai/client";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SignOutButton } from "@/components/settings/SignOutButton";
import { clearDemo, deleteAccount, loadDemo, saveTargets } from "./actions";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [settings, demo, garmin] = await Promise.all([getSettings(user.id), hasDemoData(user.id), getGarminConnection(user.id)]);

  return (
    <>
      <PageHeader title="Settings" subtitle={user.email} action={<SignOutButton />} />

      {sp.saved && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">Targets saved.</p>}
      {sp.error && <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2">Those targets didn&apos;t look right. Please check the ranges.</p>}
      {sp.demo === "cleared" && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">Sample data removed. Your own entries were kept.</p>}

      <Card title="Data sources">
        <ul className="divide-y divide-slate-100 text-sm">
          <li className="py-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800">Garmin</p>
              <p className="text-xs text-slate-500">
                {garmin ? `Connected${garmin.garminDisplayName ? ` as ${garmin.garminDisplayName}` : ""}${garmin.lastSyncAt ? ` · last sync ${garmin.lastSyncAt.toLocaleDateString()}` : ""}` : garminAvailable() ? "Not connected" : "Not set up on this server"}
              </p>
            </div>
            <Link href="/activity" className="btn-secondary">{garmin ? "Manage" : "Connect"}</Link>
          </li>
          <li className="py-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800">Claude (meal estimates, PDF reading)</p>
              <p className="text-xs text-slate-500">{aiConfigured() ? "Configured" : "Not configured: add ANTHROPIC_API_KEY on the server"}</p>
            </div>
          </li>
        </ul>
      </Card>

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
      <Card title="Your data" subtitle="It's yours. Take it with you or delete it entirely.">
        <div className="flex flex-wrap gap-3 items-center">
          <a href="/api/export" className="btn-secondary" download>Download everything (JSON)</a>
          <DeleteAccountButton action={deleteAccount} />
        </div>
        <p className="text-xs text-slate-500 mt-3">Deleting your account removes every reading, meal, scan, lab result, synced day and the Garmin connection. There is no undo.</p>
      </Card>
    </>
  );
}
