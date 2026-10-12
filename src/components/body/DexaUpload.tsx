"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDexa } from "@/app/(app)/body/actions";
import type { DexaExtraction } from "@/lib/ai/extractDexa";

type Form = {
  date: string;
  provider: string;
  totalBodyFatPct: string;
  leanMassLbs: string;
  fatMassLbs: string;
  totalMassLbs: string;
  visceralFatLbs: string;
  visceralFatAreaCm2: string;
  boneDensityTScore: string;
  androidGynoidRatio: string;
  armsFatPct: string;
  legsFatPct: string;
  trunkFatPct: string;
};

const EMPTY: Form = {
  date: "", provider: "", totalBodyFatPct: "", leanMassLbs: "", fatMassLbs: "", totalMassLbs: "", visceralFatLbs: "",
  visceralFatAreaCm2: "", boneDensityTScore: "", androidGynoidRatio: "", armsFatPct: "", legsFatPct: "", trunkFatPct: "",
};

const s = (n: number | null | undefined, d = 1) => (n == null ? "" : String(+n.toFixed(d)));

function fromExtraction(x: DexaExtraction): Form {
  return {
    date: x.scan_date ?? "",
    provider: x.provider ?? "",
    totalBodyFatPct: s(x.total_body_fat_pct),
    leanMassLbs: s(x.lean_mass_lbs),
    fatMassLbs: s(x.fat_mass_lbs),
    totalMassLbs: s(x.total_mass_lbs),
    visceralFatLbs: s(x.visceral_fat_lbs, 2),
    visceralFatAreaCm2: s(x.visceral_fat_area_cm2),
    boneDensityTScore: s(x.bone_density_t_score),
    androidGynoidRatio: s(x.android_gynoid_ratio, 2),
    armsFatPct: s(x.regional.arms?.fat_pct),
    legsFatPct: s(x.regional.legs?.fat_pct),
    trunkFatPct: s(x.regional.trunk?.fat_pct),
  };
}

const FIELDS: { key: keyof Form; label: string; step?: string }[] = [
  { key: "totalBodyFatPct", label: "Total body fat %", step: "0.1" },
  { key: "leanMassLbs", label: "Lean mass (lbs)", step: "0.1" },
  { key: "fatMassLbs", label: "Fat mass (lbs)", step: "0.1" },
  { key: "totalMassLbs", label: "Total mass (lbs)", step: "0.1" },
  { key: "visceralFatLbs", label: "Visceral fat (lbs)", step: "0.01" },
  { key: "visceralFatAreaCm2", label: "Visceral fat area (cm²)", step: "1" },
  { key: "boneDensityTScore", label: "Bone density T-score", step: "0.1" },
  { key: "androidGynoidRatio", label: "Android/gynoid ratio", step: "0.01" },
  { key: "armsFatPct", label: "Arms fat %", step: "0.1" },
  { key: "legsFatPct", label: "Legs fat %", step: "0.1" },
  { key: "trunkFatPct", label: "Trunk fat %", step: "0.1" },
];

export function DexaUpload({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "uploading" | "review">("idle");
  const [form, setForm] = useState<Form>(EMPTY);
  const [extraction, setExtraction] = useState<DexaExtraction | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  async function upload(file: File) {
    setError(null);
    setMode("uploading");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/extract/dexa", { method: "POST", body });
      const json = (await res.json()) as { ok: boolean; extraction?: DexaExtraction; filename?: string; error?: string };
      if (!json.ok || !json.extraction) throw new Error(json.error ?? "Couldn't read that file.");
      setExtraction(json.extraction);
      setFilename(json.filename ?? file.name);
      setForm(fromExtraction(json.extraction));
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
      setMode("idle");
    }
  }

  function save() {
    setError(null);
    const n = (v: string) => (v === "" ? null : Number(v));
    startSave(async () => {
      const res = await saveDexa({
        date: form.date,
        provider: form.provider || null,
        totalBodyFatPct: n(form.totalBodyFatPct),
        leanMassLbs: n(form.leanMassLbs),
        fatMassLbs: n(form.fatMassLbs),
        totalMassLbs: n(form.totalMassLbs),
        visceralFatLbs: n(form.visceralFatLbs),
        visceralFatAreaCm2: n(form.visceralFatAreaCm2),
        boneDensityTScore: n(form.boneDensityTScore),
        androidGynoidRatio: n(form.androidGynoidRatio),
        regional: {
          arms: form.armsFatPct ? { fatPct: n(form.armsFatPct) } : null,
          legs: form.legsFatPct ? { fatPct: n(form.legsFatPct) } : null,
          trunk: form.trunkFatPct ? { fatPct: n(form.trunkFatPct) } : null,
        },
        filename,
        rawExtraction: extraction ?? undefined,
        notes: extraction?.notes || null,
      });
      if (!res.ok) return setError(res.error);
      setMode("idle");
      setForm(EMPTY);
      setExtraction(null);
      setFilename(null);
      router.refresh();
    });
  }

  if (mode === "review") {
    return (
      <div className="space-y-4">
        {extraction && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-sm text-slate-700">
            <p>Read from <span className="font-medium">{filename}</span>. Check the numbers against your report, fix anything that&apos;s off, then save.</p>
            {extraction.notes && <p className="text-xs text-slate-500 mt-1">{extraction.notes}</p>}
            <p className="text-xs text-slate-400 mt-1">Confidence: {extraction.confidence}. The file itself isn&apos;t stored.</p>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="dexa-date">Scan date</label>
            <input id="dexa-date" className="input" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label className="label" htmlFor="dexa-provider">Provider</label>
            <input id="dexa-provider" className="input" placeholder="e.g. DexaFit, BodySpec" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label text-xs" htmlFor={`dexa-${f.key}`}>{f.label}</label>
              <input id={`dexa-${f.key}`} className="input tabular-nums" type="number" inputMode="decimal" step={f.step} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button type="button" className="btn-primary" onClick={save} disabled={saving || !form.date}>{saving ? "Saving…" : "Save scan"}</button>
          <button type="button" className="btn-ghost" onClick={() => { setMode("idle"); setForm(EMPTY); setExtraction(null); }}>Cancel</button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {aiEnabled ? (
        <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 ${mode === "uploading" ? "opacity-60 pointer-events-none" : ""}`}>
          <span className="text-2xl" aria-hidden>📄</span>
          <span className="text-sm font-medium text-slate-700">{mode === "uploading" ? "Reading your report…" : "Upload your DEXA report"}</span>
          <span className="text-xs text-slate-500">PDF or a photo of the summary page, up to 4 MB. We extract the numbers and you confirm them.</span>
          <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={mode === "uploading"} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      ) : (
        <p className="text-sm text-slate-500">PDF reading needs the Claude API key on the server. You can still enter a scan by hand.</p>
      )}
      <button type="button" className="btn-secondary" onClick={() => { setExtraction(null); setFilename(null); setForm(EMPTY); setMode("review"); }}>
        Enter a scan manually
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
