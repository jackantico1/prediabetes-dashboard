import Link from "next/link";
import { dismissOnboarding } from "@/app/(app)/settings/actions";

interface Props {
  hasReadings: boolean;
  hasLabs: boolean;
  hasGarmin: boolean;
}

export function OnboardingCard({ hasReadings, hasLabs, hasGarmin }: Props) {
  const steps = [
    { done: hasReadings, label: "Log a fasting glucose reading", hint: "First thing in the morning, before eating.", href: "/glucose?log=1" },
    { done: hasLabs, label: "Upload your latest blood work", hint: "A PDF from your doctor or lab. We pull out HbA1c and the rest.", href: "/labs" },
    { done: hasGarmin, label: "Connect Garmin (optional)", hint: "Brings in sleep, steps, HRV and weight automatically.", href: "/activity" },
  ];
  return (
    <section className="card p-5 md:p-6 bg-gradient-to-br from-teal-50 to-white border-teal-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-800">Welcome. Let&apos;s get your first numbers in.</h2>
          <p className="text-sm text-slate-600 mt-1">Three small steps. You can skip any of them and come back later.</p>
        </div>
        <form action={dismissOnboarding}>
          <button type="submit" className="btn-ghost text-xs">Dismiss</button>
        </form>
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((s, i) => (
          <li key={s.label}>
            <Link href={s.href} className={`flex items-start gap-3 rounded-xl border p-3 bg-white/80 hover:bg-white ${s.done ? "border-emerald-200" : "border-slate-200"}`}>
              <span className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"}`}>
                {s.done ? "✓" : i + 1}
              </span>
              <span>
                <span className={`block text-sm font-medium ${s.done ? "text-slate-500 line-through" : "text-slate-800"}`}>{s.label}</span>
                <span className="block text-xs text-slate-500">{s.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-500 mt-4">
        Just want to look around? <Link href="/settings#demo" className="text-teal-700 font-medium">Load sample data</Link> to see the dashboard filled in, then clear it with one click.
      </p>
    </section>
  );
}
