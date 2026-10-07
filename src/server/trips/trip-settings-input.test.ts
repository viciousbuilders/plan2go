import { describe, expect, it } from "vitest";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import { addDays } from "@/core/time/zoned";
import { tripSettingsSchema } from "./trip-settings-input";

const FIRST = "2026-10-10";

function settings(endDate: string) {
  return tripSettingsSchema.safeParse({ slug: "abc123", title: "Hanoi", startDate: FIRST, endDate });
}

describe("tripSettingsSchema", () => {
  it("takes a trip of a whole year, both ends counted", () => {
    expect(settings(addDays(FIRST, MAX_TRIP_DAYS - 1)).success).toBe(true);
  });

  it("refuses a day past a year, and says so about the last day", () => {
    const result = settings(addDays(FIRST, MAX_TRIP_DAYS));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "A trip runs to 365 days at most. Choose an earlier last day.",
    );
    expect(result.error?.issues[0]?.path).toEqual(["endDate"]);
  });

  it("still refuses a last day before the first", () => {
    const result = settings(addDays(FIRST, -1));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "The last day is before the first day. Choose a later last day.",
    );
  });

  it("takes a trip of one day", () => {
    expect(settings(FIRST).success).toBe(true);
  });
});
