import { describe, expect, it } from "vitest";
import { formatDateRange, formatTripDates } from "./date-range";

describe("formatDateRange", () => {
  it("writes the month once when both ends share it", () => {
    expect(formatDateRange("2026-09-19", "2026-09-23")).toBe("19 to 23 Sept");
  });

  it("names both months across the end of one", () => {
    expect(formatDateRange("2026-09-30", "2026-10-02")).toBe("30 Sept to 2 Oct");
  });

  it("names both years across the end of one", () => {
    expect(formatDateRange("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 to 2 Jan 2027");
  });

  it("says a trip of one day once", () => {
    expect(formatDateRange("2026-10-10", "2026-10-10")).toBe("10 Oct");
  });

  it("never writes a dash", () => {
    const ranges = [
      formatDateRange("2026-09-19", "2026-09-23"),
      formatDateRange("2026-09-30", "2026-10-02"),
      formatDateRange("2026-12-30", "2027-01-02"),
    ];
    for (const range of ranges) {
      expect(range).not.toMatch(/[–—]/);
    }
  });
});

describe("formatTripDates", () => {
  it("counts both ends of the trip", () => {
    expect(formatTripDates("2026-10-10", "2026-10-14")).toBe("10 to 14 Oct · 5 days");
  });

  it("says a trip of one day in the singular", () => {
    expect(formatTripDates("2026-10-10", "2026-10-10")).toBe("10 Oct · 1 day");
  });

  it("counts across the end of a month", () => {
    expect(formatTripDates("2026-09-29", "2026-10-02")).toBe("29 Sept to 2 Oct · 4 days");
  });

  it("gives no count for a range that runs backwards", () => {
    expect(formatTripDates("2026-10-14", "2026-10-10")).toBe(
      formatDateRange("2026-10-14", "2026-10-10"),
    );
  });
});
