import Link from "next/link";

const ITEMS = [
  { href: "/glucose?log=1", label: "Glucose", icon: "🩸" },
  { href: "/food?log=1", label: "Meal", icon: "🥗" },
  { href: "/body?log=1", label: "Weight", icon: "⚖️" },
];

export function QuickLogRow() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {ITEMS.map((i) => (
        <Link key={i.href} href={i.href} className="card p-3 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <span aria-hidden>{i.icon}</span> Log {i.label}
        </Link>
      ))}
    </div>
  );
}
