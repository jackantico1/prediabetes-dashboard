import "server-only";
import { z } from "zod";
import { extractFromDocument, type AcceptedMime } from "./documents";

const num = z.number().nullable();
const region = z
  .object({ fat_pct: num, lean_lbs: num, fat_lbs: num })
  .nullable();

export const DexaExtractionSchema = z.object({
  scan_date: z.string().nullable().describe("Scan date as YYYY-MM-DD, or null if not shown"),
  provider: z.string().nullable().describe("Clinic or service name, e.g. DexaFit, BodySpec, hospital name"),
  total_body_fat_pct: num,
  lean_mass_lbs: num.describe("Total lean (fat-free, non-bone) mass in pounds"),
  fat_mass_lbs: num,
  total_mass_lbs: num,
  visceral_fat_lbs: num.describe("Visceral adipose tissue (VAT) mass in pounds; convert from grams or kg if needed"),
  visceral_fat_area_cm2: num.describe("VAT area in cm², if reported"),
  bone_density_t_score: num.describe("Total body BMD T-score, if reported"),
  bone_density_z_score: num,
  android_gynoid_ratio: num.describe("A/G ratio, if reported"),
  regional: z.object({ arms: region, legs: region, trunk: region }),
  notes: z.string().describe("Anything worth knowing: units converted, values that were ambiguous, fields that were missing. Empty string if none."),
  confidence: z.enum(["low", "medium", "high"]),
});

export type DexaExtraction = z.infer<typeof DexaExtractionSchema>;

const SYSTEM = `You read DEXA (DXA) body composition reports and return the numbers exactly as printed, converted to pounds and percent.
Rules:
- Use null for anything not present in the report. Never guess a value.
- Convert kg to lbs (×2.20462) and grams to lbs (÷453.592). Say so in notes.
- "Visceral fat" means VAT (visceral adipose tissue); do not confuse it with android or trunk fat.
- Lean mass excludes bone mineral content when the report distinguishes them.
- Regional values: arms and legs combined (both sides), trunk as printed.`;

export function extractDexa(data: Uint8Array, mime: AcceptedMime): Promise<DexaExtraction> {
  return extractFromDocument(data, mime, DexaExtractionSchema, SYSTEM, "Extract the body composition results from this DEXA report.");
}
