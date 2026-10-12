import { describe, expect, it } from "vitest";
import type { GlucoseReading, Meal } from "@/db/schema";
import { pairMealsWithGlucose } from "./pairing";

const T0 = new Date("2026-06-30T18:00:00Z");
const min = (m: number) => new Date(T0.getTime() + m * 60_000);

const meal = (id: string, ts = T0): Meal => ({
  id, userId: "u", ts, description: "Pasta", carbsG: 90, proteinG: 20, fatG: 15, fiberG: 5, calories: 650,
  estimateConfidence: null, estimateNotes: null, notes: null, source: "manual", createdAt: ts,
});
const r = (id: string, ts: Date, value: number, tag: GlucoseReading["tag"], mealId: string | null = null): GlucoseReading => ({
  id, userId: "u", ts, valueMgdl: value, tag, note: null, mealId, source: "manual", createdAt: ts,
});

describe("pairMealsWithGlucose", () => {
  it("pairs a before reading and after readings within the windows", () => {
    const [m] = pairMealsWithGlucose([meal("m1")], [
      r("a", min(-10), 98, "before_meal"),
      r("b", min(60), 162, "after_meal"),
      r("c", min(120), 140, "other"),
      r("d", min(200), 110, "other"), // > 3h, ignored
    ]);
    expect(m.response?.before?.valueMgdl).toBe(98);
    expect(m.response?.after.map((x) => x.valueMgdl)).toEqual([162, 140]);
    expect(m.response?.peak).toBe(162);
    expect(m.response?.rise).toBe(64);
  });

  it("returns null response when nothing brackets the meal", () => {
    const [m] = pairMealsWithGlucose([meal("m1")], [r("a", min(-300), 100, "fasting")]);
    expect(m.response).toBeNull();
  });

  it("uses explicit mealId links and keeps readings linked elsewhere out", () => {
    const [m1, m2] = pairMealsWithGlucose([meal("m1"), meal("m2", min(30))], [
      r("a", min(-5), 100, "before_meal", "m1"),
      r("b", min(70), 150, "after_meal", "m2"),
    ]);
    expect(m1.response?.before?.id).toBe("a");
    expect(m1.response?.after).toHaveLength(0);
    expect(m2.response?.after.map((x) => x.id)).toEqual(["b"]);
  });

  it("does not treat a fasting reading as an after-meal response", () => {
    const [m] = pairMealsWithGlucose([meal("m1")], [r("a", min(90), 95, "fasting")]);
    expect(m.response).toBeNull();
  });
});
