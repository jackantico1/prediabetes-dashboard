import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { weightEntries, type WeightEntry, type DataSource } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function listWeight(userId: string, sinceDate: string): Promise<WeightEntry[]> {
  const db = await getDb();
  return db
    .select()
    .from(weightEntries)
    .where(and(eq(weightEntries.userId, userId), gte(weightEntries.date, sinceDate)))
    .orderBy(desc(weightEntries.date));
}

export async function latestWeight(userId: string): Promise<WeightEntry | null> {
  const db = await getDb();
  const [row] = await db.select().from(weightEntries).where(eq(weightEntries.userId, userId)).orderBy(desc(weightEntries.date)).limit(1);
  return row ?? null;
}

/** One entry per user/date/source: re-logging the same day overwrites. */
export async function upsertWeight(
  userId: string,
  input: { date: string; weightLbs: number; bodyFatPct?: number | null; muscleMassLbs?: number | null; bmi?: number | null; source?: DataSource }
) {
  const db = await getDb();
  const source = input.source ?? "manual";
  await db
    .insert(weightEntries)
    .values({ id: newId(), userId, ...input, source })
    .onConflictDoUpdate({
      target: [weightEntries.userId, weightEntries.date, weightEntries.source],
      set: {
        weightLbs: sql`excluded.weight_lbs`,
        bodyFatPct: sql`excluded.body_fat_pct`,
        muscleMassLbs: sql`excluded.muscle_mass_lbs`,
        bmi: sql`excluded.bmi`,
      },
    });
}

export async function deleteWeight(userId: string, id: string) {
  const db = await getDb();
  await db.delete(weightEntries).where(and(eq(weightEntries.id, id), eq(weightEntries.userId, userId)));
}
