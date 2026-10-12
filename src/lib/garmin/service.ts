import "server-only";

/** Typed client for the Python Garmin service (garmin_service/app.py). */

export interface GarminDay {
  date: string;
  steps: number | null;
  activeMinutes: number | null;
  intensityMinutes: number | null;
  restingHr: number | null;
  avgStress: number | null;
  bodyBatteryHigh: number | null;
  bodyBatteryLow: number | null;
  calories: number | null;
  sleepHours: number | null;
  deepHours: number | null;
  remHours: number | null;
  lightHours: number | null;
  awakeHours: number | null;
  sleepScore: number | null;
  hrvMs: number | null;
}

export interface GarminBodyEntry {
  date: string;
  weightLbs: number;
  bodyFatPct: number | null;
  muscleMassLbs: number | null;
  bmi: number | null;
}

export interface SyncResponse {
  days: GarminDay[];
  body: GarminBodyEntry[];
  requested_days: number;
  token_blob: string;
  range: { start: string; end: string };
}

export class GarminServiceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function garminServiceConfigured(): boolean {
  return Boolean(process.env.GARMIN_SERVICE_SECRET);
}

function baseUrl(): string {
  if (process.env.GARMIN_SERVICE_URL) return process.env.GARMIN_SERVICE_URL.replace(/\/$/, "");
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (host) return `https://${host}/api/py`;
  return "http://127.0.0.1:8000/api/py";
}

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const secret = process.env.GARMIN_SERVICE_SECRET;
  if (!secret) throw new GarminServiceError("not_configured", "Garmin sync isn't set up on this server (missing GARMIN_SERVICE_SECRET).", 503);
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-secret": secret },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    throw new GarminServiceError(
      timeout ? "timeout" : "service_unreachable",
      timeout ? "Garmin sync took too long. Try again; it continues where it left off." : "Couldn't reach the Garmin sync service. Is it running?",
      502
    );
  }
  const json = (await res.json().catch(() => null)) as { code?: string; message?: string; detail?: { code?: string; message?: string } } | null;
  if (!res.ok) {
    const code = json?.code ?? json?.detail?.code ?? "garmin_error";
    const message = json?.message ?? json?.detail?.message ?? `Garmin service error (${res.status}).`;
    throw new GarminServiceError(code, message, res.status);
  }
  return json as T;
}

export function garminLogin(email: string, password: string) {
  return post<{ token_blob: string; display_name: string | null }>("/garmin/login", { email, password }, 60_000);
}

export function garminSync(tokenBlob: string, startDate: string, endDate: string) {
  return post<SyncResponse>("/garmin/sync", { token_blob: tokenBlob, start_date: startDate, end_date: endDate }, 115_000);
}
