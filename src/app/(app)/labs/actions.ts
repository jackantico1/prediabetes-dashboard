"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { addLabReport, deleteLabReport, deleteLabResult } from "@/lib/repo/labs";
import { normalizeMarker } from "@/lib/labs/markers";

const revalidate = () => {
  revalidatePath("/");
  revalidatePath("/labs");
};

export type ActionResult = { ok: true } | { ok: false; error: string };

const ReportInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the test date"),
  provider: z.string().trim().max(120).nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
  rawExtraction: z.unknown().optional(),
  results: z
    .array(
      z.object({
        marker: z.string().trim().min(1).max(120),
        value: z.coerce.number(),
        unit: z.string().trim().max(40).default(""),
        refMin: z.coerce.number().nullable().optional(),
        refMax: z.coerce.number().nullable().optional(),
      })
    )
    .min(1, "Add at least one result"),
});

export async function saveLabReport(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid report" };
  const d = parsed.data;
  await addLabReport(
    user.id,
    { date: d.date, provider: d.provider ?? null, filename: d.filename ?? null, rawExtraction: d.rawExtraction ?? null, source: d.rawExtraction ? "claude" : "manual" },
    d.results.map((r) => ({ marker: normalizeMarker(r.marker), value: r.value, unit: r.unit, refMin: r.refMin ?? null, refMax: r.refMax ?? null }))
  );
  revalidate();
  return { ok: true };
}

export async function removeLabReport(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await deleteLabReport(user.id, id);
  revalidate();
  return { ok: true };
}

export async function removeLabResult(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await deleteLabResult(user.id, id);
  revalidate();
  return { ok: true };
}
