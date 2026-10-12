"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { getUserTimeZone } from "@/lib/time/server";
import { connectGarmin, disconnectGarmin, syncGarmin, type SyncOutcome } from "@/lib/garmin/sync";
import { GarminServiceError } from "@/lib/garmin/service";

const PATHS = ["/", "/activity", "/body", "/settings"];
const revalidate = () => PATHS.forEach((p) => revalidatePath(p));

export type ConnectResult = { ok: true; synced: SyncOutcome } | { ok: false; error: string };

const ConnectInput = z.object({
  email: z.string().trim().email("Enter the email you use for Garmin Connect"),
  password: z.string().min(1, "Enter your Garmin password"),
});

export async function connectGarminAction(input: unknown): Promise<ConnectResult> {
  const user = await requireUser();
  const parsed = ConnectInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  try {
    await connectGarmin(user.id, parsed.data.email, parsed.data.password);
  } catch (err) {
    console.error("connectGarmin failed", err instanceof GarminServiceError ? `${err.code}: ${err.message}` : err);
    return { ok: false, error: err instanceof GarminServiceError ? err.message : "Couldn't connect to Garmin. Try again in a minute." };
  }
  const tz = await getUserTimeZone();
  const synced = await syncGarmin(user.id, tz, { force: true });
  revalidate();
  return { ok: true, synced };
}

export async function syncGarminAction(): Promise<SyncOutcome> {
  const user = await requireUser();
  const tz = await getUserTimeZone();
  const result = await syncGarmin(user.id, tz);
  revalidate();
  return result;
}

export async function disconnectGarminAction() {
  const user = await requireUser();
  await disconnectGarmin(user.id);
  revalidate();
}
