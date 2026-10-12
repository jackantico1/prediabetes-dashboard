import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { userSettings, type UserSettings } from "@/db/schema";

export async function getSettings(userId: string): Promise<UserSettings> {
  const db = await getDb();
  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (existing) return existing;
  const [created] = await db.insert(userSettings).values({ userId }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return again;
}

export async function updateSettings(
  userId: string,
  patch: Partial<Pick<UserSettings, "targetFastingMgdl" | "targetPostMealMgdl" | "targetSteps" | "targetSleepHours" | "onboardingDone">>
) {
  const db = await getDb();
  await getSettings(userId);
  await db
    .update(userSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(userSettings.userId, userId));
}
