import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { labReports, labResults, type LabResult, type LabReport, type DataSource } from "@/db/schema";
import { newId } from "@/lib/ids";

export async function listLabResults(userId: string): Promise<LabResult[]> {
  const db = await getDb();
  return db.select().from(labResults).where(eq(labResults.userId, userId)).orderBy(desc(labResults.date), labResults.marker);
}

export async function listLabReports(userId: string): Promise<LabReport[]> {
  const db = await getDb();
  return db.select().from(labReports).where(eq(labReports.userId, userId)).orderBy(desc(labReports.date));
}

/** Latest and previous value per marker, newest first. */
export function summarizeMarkers(results: LabResult[]) {
  const byMarker = new Map<string, LabResult[]>();
  for (const r of results) byMarker.set(r.marker, [...(byMarker.get(r.marker) ?? []), r]);
  return [...byMarker.entries()].map(([marker, rows]) => {
    const sorted = rows.sort((a, b) => b.date.localeCompare(a.date));
    return { marker, latest: sorted[0], previous: sorted[1] ?? null, history: sorted };
  });
}

export async function addLabReport(
  userId: string,
  report: { date: string; provider?: string | null; filename?: string | null; rawExtraction?: unknown; source?: DataSource },
  results: { marker: string; value: number; unit: string; refMin?: number | null; refMax?: number | null; date?: string }[]
): Promise<LabReport> {
  const db = await getDb();
  const source = report.source ?? "manual";
  const [created] = await db
    .insert(labReports)
    .values({ id: newId(), userId, date: report.date, provider: report.provider ?? null, filename: report.filename ?? null, rawExtraction: report.rawExtraction ?? null, source })
    .returning();
  if (results.length) {
    await db.insert(labResults).values(
      results.map((r) => ({
        id: newId(),
        userId,
        reportId: created.id,
        date: r.date ?? report.date,
        marker: r.marker,
        value: r.value,
        unit: r.unit,
        refMin: r.refMin ?? null,
        refMax: r.refMax ?? null,
        source,
      }))
    );
  }
  return created;
}

export async function deleteLabReport(userId: string, id: string) {
  const db = await getDb();
  await db.delete(labReports).where(and(eq(labReports.id, id), eq(labReports.userId, userId)));
}

export async function deleteLabResult(userId: string, id: string) {
  const db = await getDb();
  await db.delete(labResults).where(and(eq(labResults.id, id), eq(labResults.userId, userId)));
}
