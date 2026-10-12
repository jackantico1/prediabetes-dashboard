import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav, TopNav } from "./Nav";
import { Disclaimer } from "@/components/ui/Disclaimer";

export function AppShell({ userName, children }: { userName: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav userName={userName} />
      <div className="md:hidden sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 h-12 flex items-center justify-between px-4">
        <Link href="/" className="font-bold text-slate-800 tracking-tight">Steady</Link>
        <Link href="/settings" className="text-sm text-slate-500" aria-label="Settings">⚙︎</Link>
      </div>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-5 md:py-8 pb-24 md:pb-10 space-y-6">
        {children}
        <Disclaimer />
      </main>
      <BottomNav />
    </div>
  );
}
