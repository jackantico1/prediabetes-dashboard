import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { garminConnections, type GarminConnection } from "@/db/schema";

export async function getGarminConnection(userId: string): Promise<GarminConnection | null> {
  const db = await getDb();
  const [row] = await db.select().from(garminConnections).where(eq(garminConnections.userId, userId));
  return row ?? null;
}

export async function saveGarminConnection(
  userId: string,
  input: { encryptedTokenBlob: string; garminDisplayName?: string | null; garminEmail?: string | null }
) {
  const db = await getDb();
  await db
    .insert(garminConnections)
    .values({ userId, ...input, status: "connected", lastError: null })
    .onConflictDoUpdate({
      target: garminConnections.userId,
      set: { ...input, status: "connected", lastError: null, updatedAt: new Date() },
    });
}

export async function updateGarminConnection(
  userId: string,
  patch: Partial<Pick<GarminConnection, "encryptedTokenBlob" | "status" | "lastSyncAt" | "lastError" | "garminDisplayName">>
) {
  const db = await getDb();
  await db.update(garminConnections).set({ ...patch, updatedAt: new Date() }).where(eq(garminConnections.userId, userId));
}

export async function deleteGarminConnection(userId: string) {
  const db = await getDb();
  await db.delete(garminConnections).where(eq(garminConnections.userId, userId));
}
