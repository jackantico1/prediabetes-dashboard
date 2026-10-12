import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyHealth, type DailyHealth, type NewDailyHealth } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function listDailyHealth(userId: string, sinceDate: string): Promise<DailyHealth[]> {
  const db = await getDb();
  return db
    .select()
    .from(dailyHealth)
    .where(and(eq(dailyHealth.userId, userId), gte(dailyHealth.date, sinceDate)))
    .orderBy(desc(dailyHealth.date));
}

const METRIC_KEYS = [
  "steps", "activeMinutes", "intensityMinutes", "restingHr", "hrvMs", "sleepHours", "deepHours", "remHours",
  "lightHours", "awakeHours", "sleepScore", "avgStress", "bodyBatteryHigh", "bodyBatteryLow", "calories",
] as const;

/** Upsert one row per user/date. Fields missing from `row` keep their previous value. */
export async function upsertDailyHealth(userId: string, rows: Omit<NewDailyHealth, "id" | "userId">[]) {
  if (!rows.length) return;
  const db = await getDb();
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of METRIC_KEYS) {
    const col = dailyHealth[key];
    set[key] = sql`coalesce(excluded.${sql.raw(col.name)}, ${dailyHealth[key]})`;
  }
  set.source = sql`excluded.source`;
  await db
    .insert(dailyHealth)
    .values(rows.map((r) => ({ id: newId(), userId, ...r })))
    .onConflictDoUpdate({ target: [dailyHealth.userId, dailyHealth.date], set });
}
