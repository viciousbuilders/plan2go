import { describe, expect, it } from "vitest";
import { sameDayIn, shiftMonths } from "./month-grid";

describe("shiftMonths", () => {
  it("steps across the end of a year both ways", () => {
    expect(shiftMonths("2026-12-01", 1)).toBe("2027-01-01");
    expect(shiftMonths("2027-01-01", -1)).toBe("2026-12-01");
  });
});

describe("sameDayIn", () => {
  it("keeps the date in the month before or after", () => {
    expect(sameDayIn("2026-10-16", 1)).toBe("2026-11-16");
    expect(sameDayIn("2026-10-16", -1)).toBe("2026-09-16");
  });

  it("stops at the last of a shorter month", () => {
    expect(sameDayIn("2026-01-31", 1)).toBe("2026-02-28");
    expect(sameDayIn("2028-03-31", -1)).toBe("2028-02-29");
    expect(sameDayIn("2026-10-31", -1)).toBe("2026-09-30");
  });

  it("steps across the end of a year both ways", () => {
    expect(sameDayIn("2026-12-15", 1)).toBe("2027-01-15");
    expect(sameDayIn("2027-01-15", -1)).toBe("2026-12-15");
  });
});
