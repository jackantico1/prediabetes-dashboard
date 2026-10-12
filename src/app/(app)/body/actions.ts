"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { deleteWeight, upsertWeight } from "@/lib/repo/weight";
import { addDexa, deleteDexa } from "@/lib/repo/dexa";

const revalidate = () => {
  revalidatePath("/");
  revalidatePath("/body");
};

export type ActionResult = { ok: true } | { ok: false; error: string };

const WeightInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  weightLbs: z.coerce.number().min(50, "That weight looks too low").max(700, "That weight looks too high"),
  bodyFatPct: z.coerce.number().min(2).max(70).nullable().optional(),
});

export async function logWeight(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = WeightInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid weight" };
  const { date, weightLbs, bodyFatPct } = parsed.data;
  await upsertWeight(user.id, { date, weightLbs, bodyFatPct: bodyFatPct ?? null });
  revalidate();
  return { ok: true };
}

export async function removeWeight(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await deleteWeight(user.id, id);
  revalidate();
  return { ok: true };
}

const opt = z.coerce.number().nullable().optional();
const Region = z.object({ fatPct: opt, leanLbs: opt, fatLbs: opt }).nullable().optional();
const DexaInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the scan date"),
  provider: z.string().trim().max(120).nullable().optional(),
  totalBodyFatPct: opt,
  leanMassLbs: opt,
  fatMassLbs: opt,
  totalMassLbs: opt,
  visceralFatLbs: opt,
  visceralFatAreaCm2: opt,
  boneDensityTScore: opt,
  boneDensityZScore: opt,
  androidGynoidRatio: opt,
  regional: z.object({ arms: Region, legs: Region, trunk: Region }).nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
  rawExtraction: z.unknown().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function saveDexa(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = DexaInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid scan" };
  const d = parsed.data;
  if (d.totalBodyFatPct == null && d.leanMassLbs == null && d.visceralFatLbs == null && d.fatMassLbs == null) {
    return { ok: false, error: "Enter at least body fat %, lean mass, fat mass or visceral fat." };
  }
  const clean = (r: z.infer<typeof Region>) => (r ? { fatPct: r.fatPct ?? undefined, leanLbs: r.leanLbs ?? undefined, fatLbs: r.fatLbs ?? undefined } : undefined);
  const regional = d.regional ? { arms: clean(d.regional.arms), legs: clean(d.regional.legs), trunk: clean(d.regional.trunk) } : null;
  await addDexa(user.id, {
    date: d.date,
    provider: d.provider ?? null,
    totalBodyFatPct: d.totalBodyFatPct ?? null,
    leanMassLbs: d.leanMassLbs ?? null,
    fatMassLbs: d.fatMassLbs ?? null,
    totalMassLbs: d.totalMassLbs ?? null,
    visceralFatLbs: d.visceralFatLbs ?? null,
    visceralFatAreaCm2: d.visceralFatAreaCm2 ?? null,
    boneDensityTScore: d.boneDensityTScore ?? null,
    boneDensityZScore: d.boneDensityZScore ?? null,
    androidGynoidRatio: d.androidGynoidRatio ?? null,
    regional: regional as never,
    filename: d.filename ?? null,
    rawExtraction: d.rawExtraction ?? null,
    notes: d.notes ?? null,
    source: d.rawExtraction ? "claude" : "manual",
  });
  // A DEXA scan is also a weight + body fat measurement for that day.
  if (d.totalMassLbs != null) {
    await upsertWeight(user.id, { date: d.date, weightLbs: d.totalMassLbs, bodyFatPct: d.totalBodyFatPct ?? null, muscleMassLbs: d.leanMassLbs ?? null, source: "import" });
  }
  revalidate();
  return { ok: true };
}

export async function removeDexa(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await deleteDexa(user.id, id);
  revalidate();
  return { ok: true };
}
