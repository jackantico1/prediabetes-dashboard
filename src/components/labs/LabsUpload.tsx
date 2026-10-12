"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveLabReport } from "@/app/(app)/labs/actions";
import type { LabExtraction } from "@/lib/ai/extractLabs";

type Row = { marker: string; value: string; unit: string; refMin: string; refMax: string };
type Extraction = Omit<LabExtraction, "results"> & { results: (LabExtraction["results"][number] & { canonical: string })[] };

const EMPTY_ROW: Row = { marker: "", value: "", unit: "", refMin: "", refMax: "" };
const STARTER_ROWS: Row[] = [
  { marker: "HbA1c", value: "", unit: "%", refMin: "4", refMax: "5.6" },
  { marker: "Fasting Glucose", value: "", unit: "mg/dL", refMin: "70", refMax: "99" },
  { marker: "Fasting Insulin", value: "", unit: "µIU/mL", refMin: "", refMax: "" },
  { marker: "Triglycerides", value: "", unit: "mg/dL", refMin: "", refMax: "149" },
  { marker: "HDL", value: "", unit: "mg/dL", refMin: "40", refMax: "" },
  { marker: "LDL", value: "", unit: "mg/dL", refMin: "", refMax: "99" },
];
const s = (n: number | null | undefined) => (n == null ? "" : String(n));

export function LabsUpload({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "uploading" | "review">("idle");
  const [date, setDate] = useState("");
  const [provider, setProvider] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  async function upload(file: File) {
    setError(null);
    setMode("uploading");
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/extract/labs", { method: "POST", body });
      const json = (await res.json()) as { ok: boolean; extraction?: Extraction; filename?: string; error?: string };
      if (!json.ok || !json.extraction) throw new Error(json.error ?? "Couldn't read that file.");
      setExtraction(json.extraction);
      setFilename(json.filename ?? file.name);
      setDate(json.extraction.collection_date ?? "");
      setProvider(json.extraction.provider ?? "");
      setRows(json.extraction.results.map((r) => ({ marker: r.canonical, value: s(r.value), unit: r.unit, refMin: s(r.ref_min), refMax: s(r.ref_max) })));
      setMode("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
      setMode("idle");
    }
  }

  function startManual() {
    setExtraction(null);
    setFilename(null);
    setDate("");
    setProvider("");
    setRows(STARTER_ROWS);
    setMode("review");
  }

  function save() {
    setError(null);
    const results = rows
      .filter((r) => r.marker.trim() && r.value !== "")
      .map((r) => ({ marker: r.marker, value: r.value, unit: r.unit, refMin: r.refMin === "" ? null : r.refMin, refMax: r.refMax === "" ? null : r.refMax }));
    startSave(async () => {
      const res = await saveLabReport({ date, provider: provider || null, filename, rawExtraction: extraction ?? undefined, results });
      if (!res.ok) return setError(res.error);
      setMode("idle");
      setRows([]);
      setExtraction(null);
      router.refresh();
    });
  }

  const update = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  if (mode === "review") {
    const filled = rows.filter((r) => r.marker.trim() && r.value !== "").length;
    return (
      <div className="space-y-4">
        {extraction && (
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-sm text-slate-700">
            <p>Found {extraction.results.length} results in <span className="font-medium">{filename}</span>. Check them against the report, then save.</p>
            {extraction.notes && <p className="text-xs text-slate-500 mt-1">{extraction.notes}</p>}
            <p className="text-xs text-slate-400 mt-1">Confidence: {extraction.confidence}. Names were standardized (e.g. &quot;Hemoglobin A1c&quot; → HbA1c) so tests line up over time. The file itself isn&apos;t stored.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="lab-date">Test date</label>
            <input id="lab-date" className="input" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="lab-provider">Lab / provider</label>
            <input id="lab-provider" className="input" placeholder="e.g. Quest, Labcorp" value={provider} onChange={(e) => setProvider(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="px-1 pb-1 font-medium">Test</th>
                <th className="px-1 pb-1 font-medium w-24">Result</th>
                <th className="px-1 pb-1 font-medium w-24">Unit</th>
                <th className="px-1 pb-1 font-medium w-20">Ref min</th>
                <th className="px-1 pb-1 font-medium w-20">Ref max</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="p-1"><input className="input py-1.5" value={r.marker} onChange={(e) => update(i, { marker: e.target.value })} placeholder="Test name" /></td>
                  <td className="p-1"><input className="input py-1.5 tabular-nums" type="number" step="any" value={r.value} onChange={(e) => update(i, { value: e.target.value })} /></td>
                  <td className="p-1"><input className="input py-1.5" value={r.unit} onChange={(e) => update(i, { unit: e.target.value })} /></td>
                  <td className="p-1"><input className="input py-1.5 tabular-nums" type="number" step="any" value={r.refMin} onChange={(e) => update(i, { refMin: e.target.value })} /></td>
                  <td className="p-1"><input className="input py-1.5 tabular-nums" type="number" step="any" value={r.refMax} onChange={(e) => update(i, { refMax: e.target.value })} /></td>
                  <td className="p-1 text-center"><button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Remove row">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={() => setRows([...rows, EMPTY_ROW])}>+ Add a row</button>
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" onClick={save} disabled={saving || !date || filled === 0}>{saving ? "Saving…" : `Save ${filled} result${filled === 1 ? "" : "s"}`}</button>
          <button type="button" className="btn-ghost" onClick={() => { setMode("idle"); setRows([]); setExtraction(null); }}>Cancel</button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {aiEnabled ? (
        <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/40 ${mode === "uploading" ? "opacity-60 pointer-events-none" : ""}`}>
          <span className="text-2xl" aria-hidden>🧪</span>
          <span className="text-sm font-medium text-slate-700">{mode === "uploading" ? "Reading your results…" : "Upload a lab report"}</span>
          <span className="text-xs text-slate-500">PDF from your lab or a photo of the results, up to 4 MB. We pull out every number and you confirm.</span>
          <input type="file" accept="application/pdf,image/*" className="sr-only" disabled={mode === "uploading"} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </label>
      ) : (
        <p className="text-sm text-slate-500">PDF reading needs the Claude API key on the server. You can still type results in.</p>
      )}
      <button type="button" className="btn-secondary" onClick={startManual}>Enter results manually</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
