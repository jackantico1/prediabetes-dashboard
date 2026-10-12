/**
 * Canonical marker names so the same test from different labs lines up over time.
 * Keys are lowercased, punctuation-stripped versions of names as labs print them.
 */
const ALIASES: Record<string, string> = {
  "hemoglobin a1c": "HbA1c",
  "hba1c": "HbA1c",
  "a1c": "HbA1c",
  "hgb a1c": "HbA1c",
  "glycohemoglobin": "HbA1c",
  "glucose": "Fasting Glucose",
  "glucose fasting": "Fasting Glucose",
  "fasting glucose": "Fasting Glucose",
  "glucose serum": "Fasting Glucose",
  "glucose plasma": "Fasting Glucose",
  "insulin": "Fasting Insulin",
  "insulin fasting": "Fasting Insulin",
  "fasting insulin": "Fasting Insulin",
  "triglycerides": "Triglycerides",
  "hdl": "HDL",
  "hdl cholesterol": "HDL",
  "hdlc": "HDL",
  "ldl": "LDL",
  "ldl cholesterol": "LDL",
  "ldlc": "LDL",
  "ldl cholesterol calc": "LDL",
  "ldl chol calc nih": "LDL",
  "ldl chol calc": "LDL",
  "ldl calculated": "LDL",
  "cholesterol total": "Total Cholesterol",
  "total cholesterol": "Total Cholesterol",
  "cholesterol": "Total Cholesterol",
  "hs crp": "hs-CRP",
  "hscrp": "hs-CRP",
  "c reactive protein": "hs-CRP",
  "crp": "hs-CRP",
  "c reactive protein cardiac": "hs-CRP",
  "apob": "ApoB",
  "apolipoprotein b": "ApoB",
  "uric acid": "Uric Acid",
  "vitamin d": "Vitamin D",
  "vitamin d 25 hydroxy": "Vitamin D",
  "25 hydroxy vitamin d": "Vitamin D",
  "alt": "ALT",
  "ast": "AST",
  "tsh": "TSH",
  "ferritin": "Ferritin",
  "homa ir": "HOMA-IR",
  "homair": "HOMA-IR",
  "omega 3 index": "Omega-3 Index",
};

export function normalizeMarker(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ALIASES[key] ?? name.trim();
}

/** Markers most relevant to prediabetes, in display order. Others follow alphabetically. */
export const KEY_MARKERS = ["HbA1c", "Fasting Glucose", "Fasting Insulin", "HOMA-IR", "Triglycerides", "HDL", "LDL", "ApoB", "Total Cholesterol", "hs-CRP", "ALT", "Vitamin D"];

export const MARKER_HELP: Record<string, string> = {
  HbA1c: "Average glucose over ~3 months. Under 5.7% is normal, 5.7–6.4% is prediabetes.",
  "Fasting Glucose": "Glucose after an overnight fast. Under 100 is normal, 100–125 is prediabetes.",
  "Fasting Insulin": "How hard your pancreas works to keep glucose normal. Lower is better; many clinicians like to see it under ~8.",
  "HOMA-IR": "Insulin resistance estimate from fasting glucose and insulin. Under 1.0 is ideal; over 2.0 suggests resistance.",
  Triglycerides: "Blood fats that track closely with carb intake and insulin resistance. Under 100 is ideal.",
  HDL: "Protective cholesterol. Higher is better; rises with exercise and weight loss.",
  LDL: "Cholesterol carried in LDL particles. Lower is generally better.",
  ApoB: "Count of atherogenic particles. Many consider it a better risk marker than LDL.",
  "hs-CRP": "Low-grade inflammation. Under 1.0 is low risk.",
  ALT: "Liver enzyme. Elevated ALT can point to fatty liver, which travels with insulin resistance.",
  "Vitamin D": "Low vitamin D is common and associated with insulin resistance.",
};

/** Sort order: key markers first (in order), then everything else alphabetically. */
export function markerRank(marker: string): number {
  const i = KEY_MARKERS.indexOf(marker);
  return i === -1 ? KEY_MARKERS.length : i;
}

/** Status against the reference range, with prediabetes-aware overrides for the headline markers. */
export function markerStatus(marker: string, value: number, refMin: number | null, refMax: number | null): "good" | "warn" | "bad" | "neutral" {
  if (marker === "HbA1c") return value < 5.7 ? "good" : value < 6.5 ? "warn" : "bad";
  if (marker === "Fasting Glucose") return value < 100 ? "good" : value < 126 ? "warn" : "bad";
  if (marker === "HDL") return value >= 40 ? "good" : "warn";
  if (refMin == null && refMax == null) return "neutral";
  if (refMax != null && value > refMax) return value > refMax * 1.5 ? "bad" : "warn";
  if (refMin != null && value < refMin) return "warn";
  return "good";
}
