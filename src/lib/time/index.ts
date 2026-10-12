/**
 * Date helpers that respect the user's timezone (sent by the browser as a `tz` cookie).
 * Readings are stored as absolute timestamps; "which day" is a presentation question.
 */

export function isValidTimeZone(tz: string | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** yyyy-MM-dd for a timestamp in the given timezone. */
export function localDate(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hour of day (0-23) for a timestamp in the given timezone. */
export function localHour(d: Date, tz: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(d);
  return Number(h) % 24;
}

export function daysAgo(n: number, from = new Date()): Date {
  return new Date(from.getTime() - n * 86_400_000);
}

/** Shift a yyyy-MM-dd string by n days (pure calendar math, no timezone). */
export function shiftDate(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function formatShortDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A Date for `date` at hour:minute wall-clock time in the given timezone. */
export function zonedTime(date: string, hour: number, minute: number, tz: string): Date {
  const guess = new Date(`${date}T${pad(hour)}:${pad(minute)}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}
