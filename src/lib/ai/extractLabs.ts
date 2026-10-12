import "server-only";
import { z } from "zod";
import { extractFromDocument, type AcceptedMime } from "./documents";

export const LabExtractionSchema = z.object({
  collection_date: z.string().nullable().describe("Specimen collection date as YYYY-MM-DD, or null"),
  provider: z.string().nullable().describe("Lab or service name, e.g. Quest, Labcorp, Function Health"),
  results: z.array(
    z.object({
      marker: z.string().describe("Test name as printed"),
      value: z.number().describe("Numeric result. For '<5' style results use the number."),
      unit: z.string().describe("Unit as printed, empty string if none"),
      ref_min: z.number().nullable().describe("Lower bound of the reference range, or null"),
      ref_max: z.number().nullable().describe("Upper bound of the reference range, or null"),
      flag: z.enum(["low", "normal", "high", "unknown"]),
    })
  ),
  notes: z.string().describe("Anything ambiguous or skipped (non-numeric results, panels that were cut off). Empty string if none."),
  confidence: z.enum(["low", "medium", "high"]),
});

export type LabExtraction = z.infer<typeof LabExtractionSchema>;

const SYSTEM = `You read blood test reports and return every numeric result exactly as printed.
Rules:
- Include every numeric analyte on the report. Skip non-numeric results (e.g. "Negative", "Not detected") and mention them in notes.
- Keep the marker name as printed; do not rename or merge tests.
- Reference ranges: if printed as "70-99" set min 70 max 99; "<100" → min null max 100; ">40" → min 40 max null.
- Dates as YYYY-MM-DD. Prefer the collection date over the report date.
- Never invent a value. If a number is unreadable, leave it out and say so in notes.`;

export function extractLabs(data: Uint8Array, mime: AcceptedMime): Promise<LabExtraction> {
  return extractFromDocument(data, mime, LabExtractionSchema, SYSTEM, "Extract all numeric lab results from this report.");
}
