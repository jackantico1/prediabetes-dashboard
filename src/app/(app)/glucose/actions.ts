"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { addGlucose, deleteGlucose, updateGlucose } from "@/lib/repo/glucose";
import { glucoseTagEnum } from "@/db/schema";

const ReadingInput = z.object({
  valueMgdl: z.coerce.number().int().min(20, "That looks too low to be right").max(600, "That looks too high to be right"),
  tag: z.enum(glucoseTagEnum.enumValues),
  ts: z.coerce.date(),
  note: z.string().trim().max(280).optional().or(z.literal("")),
  mealId: z.string().optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addReading(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ReadingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reading" };
  const { valueMgdl, tag, ts, note, mealId } = parsed.data;
  if (ts.getTime() > Date.now() + 5 * 60_000) return { ok: false, error: "That time is in the future" };
  await addGlucose(user.id, { valueMgdl, tag, ts, note: note || null, mealId: mealId || null });
  revalidatePath("/");
  revalidatePath("/glucose");
  revalidatePath("/food");
  return { ok: true };
}

export async function editReading(id: string, input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = ReadingInput.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid reading" };
  const { valueMgdl, tag, ts, note } = parsed.data;
  await updateGlucose(user.id, id, { valueMgdl, tag, ts, note: note === undefined ? undefined : note || null });
  revalidatePath("/");
  revalidatePath("/glucose");
  return { ok: true };
}

export async function removeReading(id: string): Promise<ActionResult> {
  const user = await requireUser();
  await deleteGlucose(user.id, id);
  revalidatePath("/");
  revalidatePath("/glucose");
  revalidatePath("/food");
  return { ok: true };
}
