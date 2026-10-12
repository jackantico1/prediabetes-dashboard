"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { updateSettings } from "@/lib/repo/settings";
import { clearDemoData, seedDemoData } from "@/lib/demo/seed";
import { getUserTimeZone } from "@/lib/time/server";

const ALL_PATHS = ["/", "/glucose", "/food", "/body", "/labs", "/activity", "/settings"];
const revalidateAll = () => ALL_PATHS.forEach((p) => revalidatePath(p));

export async function dismissOnboarding() {
  const user = await requireUser();
  await updateSettings(user.id, { onboardingDone: true });
  revalidatePath("/");
}

const TargetsInput = z.object({
  targetFastingMgdl: z.coerce.number().int().min(70).max(130),
  targetPostMealMgdl: z.coerce.number().int().min(100).max(200),
  targetSteps: z.coerce.number().int().min(1000).max(30000),
  targetSleepHours: z.coerce.number().min(5).max(10),
});

export async function saveTargets(formData: FormData) {
  const user = await requireUser();
  const parsed = TargetsInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/settings?error=targets");
  await updateSettings(user.id, parsed.data);
  revalidateAll();
  redirect("/settings?saved=1");
}

export async function loadDemo() {
  const user = await requireUser();
  const tz = await getUserTimeZone();
  await seedDemoData(user.id, tz);
  await updateSettings(user.id, { onboardingDone: true });
  revalidateAll();
  redirect("/?demo=loaded");
}

export async function clearDemo() {
  const user = await requireUser();
  await clearDemoData(user.id);
  revalidateAll();
  redirect("/settings?demo=cleared");
}
