import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { meals, type Meal, type NewMeal } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function listMeals(userId: string, since: Date, until = new Date()): Promise<Meal[]> {
  const db = await getDb();
  return db
    .select()
    .from(meals)
    .where(and(eq(meals.userId, userId), gte(meals.ts, since), lte(meals.ts, until)))
    .orderBy(desc(meals.ts));
}

export async function addMeal(userId: string, input: Omit<NewMeal, "id" | "userId">): Promise<Meal> {
  const db = await getDb();
  const [row] = await db.insert(meals).values({ id: newId(), userId, ...input }).returning();
  return row;
}

export async function updateMeal(userId: string, id: string, patch: Partial<Omit<NewMeal, "id" | "userId">>) {
  const db = await getDb();
  await db.update(meals).set(patch).where(and(eq(meals.id, id), eq(meals.userId, userId)));
}

export async function deleteMeal(userId: string, id: string) {
  const db = await getDb();
  await db.delete(meals).where(and(eq(meals.id, id), eq(meals.userId, userId)));
}
