import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { glucoseReadings, type GlucoseReading, type GlucoseTag, type DataSource } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function listGlucose(userId: string, since: Date, until = new Date()): Promise<GlucoseReading[]> {
  const db = await getDb();
  return db
    .select()
    .from(glucoseReadings)
    .where(and(eq(glucoseReadings.userId, userId), gte(glucoseReadings.ts, since), lte(glucoseReadings.ts, until)))
    .orderBy(desc(glucoseReadings.ts));
}

export async function recentGlucose(userId: string, limit = 50): Promise<GlucoseReading[]> {
  const db = await getDb();
  return db.select().from(glucoseReadings).where(eq(glucoseReadings.userId, userId)).orderBy(desc(glucoseReadings.ts)).limit(limit);
}

export async function addGlucose(
  userId: string,
  input: { ts: Date; valueMgdl: number; tag: GlucoseTag; note?: string | null; mealId?: string | null; source?: DataSource }
): Promise<GlucoseReading> {
  const db = await getDb();
  const [row] = await db
    .insert(glucoseReadings)
    .values({ id: newId(), userId, source: "manual", ...input })
    .returning();
  return row;
}

export async function updateGlucose(
  userId: string,
  id: string,
  patch: Partial<{ ts: Date; valueMgdl: number; tag: GlucoseTag; note: string | null }>
) {
  const db = await getDb();
  await db.update(glucoseReadings).set(patch).where(and(eq(glucoseReadings.id, id), eq(glucoseReadings.userId, userId)));
}

export async function deleteGlucose(userId: string, id: string) {
  const db = await getDb();
  await db.delete(glucoseReadings).where(and(eq(glucoseReadings.id, id), eq(glucoseReadings.userId, userId)));
}
