import "server-only";
import path from "node:path";
import fs from "node:fs";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Database access.
 *
 * - With DATABASE_URL set (Neon or any Postgres with the Neon HTTP proxy) we use the
 *   Neon serverless driver, which works on Vercel.
 * - Without DATABASE_URL (local dev, tests) we fall back to PGlite, an embedded
 *   Postgres that stores data in `.data/pg`. Migrations in `drizzle/` run automatically
 *   on first use, so `npm run dev` needs no infrastructure.
 */
export type Db = NeonHttpDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __db?: Promise<Db> };

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    return drizzleNeon({ client: neon(url), schema, casing: "snake_case" });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pg");
  if (dataDir !== "memory://") fs.mkdirSync(dataDir, { recursive: true });
  const client = dataDir === "memory://" ? new PGlite() : new PGlite(dataDir);
  const db = drizzlePglite({ client, schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalForDb.__db) {
    globalForDb.__db = createDb().catch((err) => {
      // Don't cache a failed connection attempt.
      globalForDb.__db = undefined;
      throw err;
    });
  }
  return globalForDb.__db;
}

export const isPglite = () => !process.env.DATABASE_URL;
export { schema };
