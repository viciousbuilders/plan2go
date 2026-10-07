import { describe, expect, it } from "vitest";
import { daysLost } from "./days-lost";

describe("daysLost", () => {
  it("says nothing when the trip keeps every day", () => {
    expect(daysLost([2, 0, 3], 3)).toBeNull();
    expect(daysLost([2, 0, 3], 5)).toBeNull();
  });

  it("says nothing while the dates are not a trip yet", () => {
    expect(daysLost([2, 0, 3], null)).toBeNull();
  });

  it("names the last day and the stops on it", () => {
    expect(daysLost([2, 0, 3], 2)).toBe("Saving takes Day 3 off the trip, and the 3 stops on it.");
  });

  it("says one stop in the singular", () => {
    expect(daysLost([2, 1], 1)).toBe("Saving takes Day 2 off the trip, and the stop on it.");
  });

  it("names two days by both their numbers", () => {
    expect(daysLost([1, 2, 0, 4], 2)).toBe(
      "Saving takes Days 3 and 4 off the trip, and the 4 stops on them.",
    );
  });

  it("names more days as a run of them", () => {
    expect(daysLost([1, 2, 3, 4, 5], 2)).toBe(
      "Saving takes Days 3 to 5 off the trip, and the 12 stops on them.",
    );
  });

  it("says only the days when nothing is planned on them", () => {
    expect(daysLost([4, 0, 0], 1)).toBe("Saving takes Days 2 and 3 off the trip.");
  });
});
