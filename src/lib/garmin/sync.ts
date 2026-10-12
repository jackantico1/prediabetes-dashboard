import "server-only";
import { getGarminConnection, saveGarminConnection, updateGarminConnection, deleteGarminConnection } from "@/lib/repo/garmin";
import { upsertDailyHealth } from "@/lib/repo/dailyHealth";
import { upsertWeight } from "@/lib/repo/weight";
import { decrypt, encrypt, encryptionConfigured } from "./crypto";
import { GarminServiceError, garminLogin, garminSync, garminServiceConfigured } from "./service";
import { localDate, shiftDate } from "@/lib/time";

export const SYNC_COOLDOWN_MS = 10 * 60_000;
export const FIRST_SYNC_DAYS = 30;

export function garminAvailable(): boolean {
  return garminServiceConfigured() && encryptionConfigured();
}

export async function connectGarmin(userId: string, email: string, password: string) {
  if (!encryptionConfigured()) throw new GarminServiceError("not_configured", "Garmin sync isn't set up on this server (missing TOKEN_ENCRYPTION_KEY).", 503);
  const { token_blob, display_name } = await garminLogin(email, password);
  await saveGarminConnection(userId, { encryptedTokenBlob: encrypt(token_blob), garminDisplayName: display_name, garminEmail: email });
}

export async function disconnectGarmin(userId: string) {
  await deleteGarminConnection(userId);
}

export type SyncOutcome =
  | { ok: true; days: number; weights: number; range: { start: string; end: string } }
  | { ok: false; error: string; code: string };

export async function syncGarmin(userId: string, tz: string, opts: { force?: boolean } = {}): Promise<SyncOutcome> {
  const conn = await getGarminConnection(userId);
  if (!conn) return { ok: false, code: "not_connected", error: "Garmin isn't connected yet." };

  const now = new Date();
  if (!opts.force && conn.lastSyncAt && now.getTime() - conn.lastSyncAt.getTime() < SYNC_COOLDOWN_MS) {
    const mins = Math.ceil((SYNC_COOLDOWN_MS - (now.getTime() - conn.lastSyncAt.getTime())) / 60_000);
    return { ok: false, code: "cooldown", error: `Synced recently. Garmin's API is unofficial, so we wait ${mins} more minute${mins === 1 ? "" : "s"} between syncs.` };
  }

  const today = localDate(now, tz);
  // Re-fetch the last two days on every sync: Garmin finalizes sleep and totals after the fact.
  const start = conn.lastSyncAt ? shiftDate(localDate(conn.lastSyncAt, tz), -2) : shiftDate(today, -(FIRST_SYNC_DAYS - 1));

  let blob: string;
  try {
    blob = decrypt(conn.encryptedTokenBlob);
  } catch {
    await updateGarminConnection(userId, { status: "needs_reauth", lastError: "Stored connection could not be read. Please connect again." });
    return { ok: false, code: "auth_required", error: "The saved Garmin connection couldn't be read (encryption key changed?). Please connect again." };
  }

  try {
    const result = await garminSync(blob, start, today);
    await upsertDailyHealth(
      userId,
      result.days.map((d) => ({ ...d, source: "garmin" as const }))
    );
    for (const w of result.body) {
      await upsertWeight(userId, { date: w.date, weightLbs: w.weightLbs, bodyFatPct: w.bodyFatPct, muscleMassLbs: w.muscleMassLbs, bmi: w.bmi, source: "garmin" });
    }
    await updateGarminConnection(userId, {
      status: "connected",
      lastSyncAt: now,
      lastError: null,
      ...(result.token_blob !== blob ? { encryptedTokenBlob: encrypt(result.token_blob) } : {}),
    });
    return { ok: true, days: result.days.length, weights: result.body.length, range: result.range };
  } catch (err) {
    const e = err instanceof GarminServiceError ? err : new GarminServiceError("unknown", "Sync failed. Try again in a few minutes.", 500);
    await updateGarminConnection(userId, { status: e.code === "auth_required" ? "needs_reauth" : "error", lastError: e.message });
    return { ok: false, code: e.code, error: e.message };
  }
}
