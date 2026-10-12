import { describe, expect, it } from "vitest";
import { localDate, localHour, shiftDate, zonedTime } from "./index";

describe("time helpers", () => {
  it("localDate respects timezone across midnight", () => {
    const d = new Date("2026-03-10T03:30:00Z");
    expect(localDate(d, "UTC")).toBe("2026-03-10");
    expect(localDate(d, "America/New_York")).toBe("2026-03-09");
  });
  it("localHour", () => {
    expect(localHour(new Date("2026-03-10T13:00:00Z"), "America/Los_Angeles")).toBe(6);
  });
  it("shiftDate handles month boundaries", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("zonedTime round-trips with localDate/localHour", () => {
    const t = zonedTime("2026-07-04", 6, 30, "America/New_York");
    expect(t.toISOString()).toBe("2026-07-04T10:30:00.000Z");
    expect(localDate(t, "America/New_York")).toBe("2026-07-04");
    expect(localHour(t, "America/New_York")).toBe(6);
  });
});
