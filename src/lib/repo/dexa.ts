import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dexaScans, type DexaScan, type NewDexaScan } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function listDexa(userId: string): Promise<DexaScan[]> {
  const db = await getDb();
  return db.select().from(dexaScans).where(eq(dexaScans.userId, userId)).orderBy(desc(dexaScans.date));
}

export async function addDexa(userId: string, input: Omit<NewDexaScan, "id" | "userId">): Promise<DexaScan> {
  const db = await getDb();
  const [row] = await db.insert(dexaScans).values({ id: newId(), userId, ...input }).returning();
  return row;
}

export async function deleteDexa(userId: string, id: string) {
  const db = await getDb();
  await db.delete(dexaScans).where(and(eq(dexaScans.id, id), eq(dexaScans.userId, userId)));
}
