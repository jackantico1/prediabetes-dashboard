import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/db/client";
import { dailyHealth, dexaScans, glucoseReadings, labReports, labResults, meals, userSettings, weightEntries } from "@/db/schema";

/** Everything the user has entered or synced, as one JSON file. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const db = await getDb();
  const [glucose, mealRows, weights, dexa, reports, results, health, settings] = await Promise.all([
    db.select().from(glucoseReadings).where(eq(glucoseReadings.userId, user.id)),
    db.select().from(meals).where(eq(meals.userId, user.id)),
    db.select().from(weightEntries).where(eq(weightEntries.userId, user.id)),
    db.select().from(dexaScans).where(eq(dexaScans.userId, user.id)),
    db.select().from(labReports).where(eq(labReports.userId, user.id)),
    db.select().from(labResults).where(eq(labResults.userId, user.id)),
    db.select().from(dailyHealth).where(eq(dailyHealth.userId, user.id)),
    db.select().from(userSettings).where(eq(userSettings.userId, user.id)),
  ]);
  const strip = <T extends { userId: string }>(rows: T[]) =>
    rows.map((row) => {
      const copy: Record<string, unknown> = { ...row };
      delete copy.userId;
      return copy;
    });
  const payload = {
    exportedAt: new Date().toISOString(),
    user: { name: user.name, email: user.email },
    settings: settings[0] ? strip(settings)[0] : null,
    glucoseReadings: strip(glucose),
    meals: strip(mealRows),
    weightEntries: strip(weights),
    dexaScans: strip(dexa),
    labReports: strip(reports),
    labResults: strip(results),
    dailyHealth: strip(health),
  };
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="steady-export-${date}.json"`,
      "cache-control": "no-store",
    },
  });
}
