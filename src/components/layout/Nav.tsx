"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/glucose", label: "Glucose", icon: "🩸" },
  { href: "/food", label: "Food", icon: "🥗" },
  { href: "/body", label: "Body", icon: "⚖️" },
  { href: "/labs", label: "Labs", icon: "🧪" },
  { href: "/activity", label: "Activity", icon: "🏃" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-6">
        {TABS.map((t) => {
          const active = isActive(pathname, t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-teal-700" : "text-slate-500"}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-lg leading-none" aria-hidden>{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <header className="hidden md:block sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-slate-800 tracking-tight">Steady</Link>
        <ul className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-800" title="Settings">
          {userName.split(" ")[0]} · Settings
        </Link>
      </div>
    </header>
  );
}
