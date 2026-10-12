import { Disclaimer } from "@/components/ui/Disclaimer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl font-bold tracking-tight text-slate-800">Steady</p>
          <p className="text-sm text-slate-500 mt-1">Get prediabetes back on track, one number at a time.</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
      <Disclaimer />
    </div>
  );
}
