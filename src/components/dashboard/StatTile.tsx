import Link from "next/link";

type Status = "good" | "warn" | "bad" | "neutral";

interface Props {
  label: string;
  value?: string | number | null;
  unit?: string;
  sub?: string;
  status?: Status;
  href?: string;
  emptyText?: string;
  emptyCta?: string;
}

const border: Record<Status, string> = {
  good: "border-l-emerald-500",
  warn: "border-l-amber-500",
  bad: "border-l-red-500",
  neutral: "border-l-slate-300",
};

export function StatTile({ label, value, unit, sub, status = "neutral", href, emptyText, emptyCta }: Props) {
  const empty = value === null || value === undefined || value === "";
  const body = (
    <div className={`card border-l-4 p-4 h-full ${empty ? "border-l-slate-200 bg-slate-50/60" : border[status]}`}>
      <p className="card-title">{label}</p>
      {empty ? (
        <>
          <p className="text-sm text-slate-500 mt-2">{emptyText ?? "No data yet"}</p>
          {emptyCta && <p className="text-sm font-semibold text-teal-700 mt-1">{emptyCta} →</p>}
        </>
      ) : (
        <>
          <p className="mt-1.5 text-slate-900">
            <span className="text-2xl md:text-3xl font-bold tabular-nums">{value}</span>
            {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
          </p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:-translate-y-0.5 transition-transform">
      {body}
    </Link>
  ) : (
    body
  );
}
