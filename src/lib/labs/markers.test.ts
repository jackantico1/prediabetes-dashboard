import { describe, expect, it } from "vitest";
import { markerStatus, normalizeMarker } from "./markers";

describe("normalizeMarker", () => {
  it("maps common lab spellings to canonical names", () => {
    expect(normalizeMarker("Hemoglobin A1c")).toBe("HbA1c");
    expect(normalizeMarker("HEMOGLOBIN A1C")).toBe("HbA1c");
    expect(normalizeMarker("Glucose, Fasting")).toBe("Fasting Glucose");
    expect(normalizeMarker("LDL Chol Calc (NIH)")).toBe("LDL");
    expect(normalizeMarker("hs-CRP")).toBe("hs-CRP");
    expect(normalizeMarker("C-Reactive Protein, Cardiac")).toBe("hs-CRP");
  });
  it("leaves unknown markers as printed", () => {
    expect(normalizeMarker("Magnesium, RBC")).toBe("Magnesium, RBC");
  });
});

describe("markerStatus", () => {
  it("uses prediabetes bands for A1c and glucose", () => {
    expect(markerStatus("HbA1c", 5.6, 4, 5.6)).toBe("good");
    expect(markerStatus("HbA1c", 5.9, 4, 5.6)).toBe("warn");
    expect(markerStatus("HbA1c", 6.5, 4, 5.6)).toBe("bad");
    expect(markerStatus("Fasting Glucose", 110, 70, 99)).toBe("warn");
  });
  it("falls back to the reference range", () => {
    expect(markerStatus("Triglycerides", 120, 0, 149)).toBe("good");
    expect(markerStatus("Triglycerides", 160, 0, 149)).toBe("warn");
    expect(markerStatus("Triglycerides", 300, 0, 149)).toBe("bad");
    expect(markerStatus("Ferritin", 10, 30, 400)).toBe("warn");
    expect(markerStatus("Mystery", 10, null, null)).toBe("neutral");
  });
});
