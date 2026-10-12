"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { addMeal, deleteMeal, updateMeal } from "@/lib/repo/meals";
import { estimateMeal, type MealEstimate } from "@/lib/ai/estimateMeal";
import { describeAiError } from "@/lib/ai/client";

export type EstimateResult = { ok: true; estimate: MealEstimate } | { ok: false; error: string };

export async function estimateMealAction(description: string): Promise<EstimateResult> {
  await requireUser();
  const text = description.trim();
  if (text.length < 3) return { ok: false, error: "Tell me a bit more about the meal." };
  if (text.length > 1000) return { ok: false, error: "That's a long description. Keep it under 1000 characters." };
  try {
    const estimate = await estimateMeal(text);
    return { ok: true, estimate };
  } catch (err) {
    console.error("estimateMeal failed", err);
    return { ok: false, error: describeAiError(err) };
  }
}

const num = z.coerce.number().min(0).max(5000).nullable().optional();
const MealInput = z.object({
  description: z.string().trim().min(1, "Describe the meal").max(1000),
  ts: z.coerce.date(),
  carbsG: num,
  proteinG: num,
  fatG: num,
  fiberG: num,
  calories: num,
  estimateConfidence: z.enum(["low", "medium", "high"]).nullable().optional(),
  estimateNotes: z.string().max(1000).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveMeal(input: unknown): Promise<SaveResult> {
  const user = await requireUser();
  const parsed = MealInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid meal" };
  const d = parsed.data;
  const meal = await addMeal(user.id, {
    description: d.description,
    ts: d.ts,
    carbsG: d.carbsG ?? null,
    proteinG: d.proteinG ?? null,
    fatG: d.fatG ?? null,
    fiberG: d.fiberG ?? null,
    calories: d.calories ?? null,
    estimateConfidence: d.estimateConfidence ?? null,
    estimateNotes: d.estimateNotes ?? null,
    notes: d.notes ?? null,
    source: d.estimateConfidence ? "claude" : "manual",
  });
  revalidatePath("/");
  revalidatePath("/food");
  return { ok: true, id: meal.id };
}

export async function editMeal(id: string, input: unknown): Promise<SaveResult> {
  const user = await requireUser();
  const parsed = MealInput.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid meal" };
  await updateMeal(user.id, id, parsed.data);
  revalidatePath("/");
  revalidatePath("/food");
  return { ok: true, id };
}

export async function removeMeal(id: string) {
  const user = await requireUser();
  await deleteMeal(user.id, id);
  revalidatePath("/");
  revalidatePath("/food");
}
