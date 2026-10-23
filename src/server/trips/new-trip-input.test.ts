import { describe, expect, it } from "vitest";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import { addDays } from "@/core/time/zoned";
import { newTripInputSchema } from "./new-trip-input";

const START = "2026-10-08";

function trip(cityPlaceId: unknown, startDate: unknown, endDate: unknown) {
  return newTripInputSchema.safeParse({ cityPlaceId, startDate, endDate });
}

function refusal(result: ReturnType<typeof trip>) {
  const first = result.error?.issues[0];
  return { message: first?.message, field: first?.path[0] };
}

describe("newTripInputSchema", () => {
  it("reads the city and both ends of the trip as one stop of that many days", () => {
    const result = trip(" hanoi ", "2026-10-23", "2026-10-27");
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      stops: [{ cityPlaceId: "hanoi", days: 5 }],
      startDate: "2026-10-23",
    });
  });

  it("counts a trip that starts and ends on one day as one day", () => {
    expect(trip("hanoi", START, START).data?.stops).toEqual([{ cityPlaceId: "hanoi", days: 1 }]);
  });

  it("gives the city as long as a trip may run, and no longer", () => {
    const last = addDays(START, MAX_TRIP_DAYS - 1);
    expect(trip("hanoi", START, last).data?.stops).toEqual([
      { cityPlaceId: "hanoi", days: MAX_TRIP_DAYS },
    ]);
    expect(refusal(trip("hanoi", START, addDays(last, 1)))).toEqual({
      message: "A trip runs to 365 days at most. Choose an earlier last day.",
      field: "endDate",
    });
  });

  it("refuses a last day before the first", () => {
    expect(refusal(trip("hanoi", START, addDays(START, -1)))).toEqual({
      message: "The last day is before the first day. Choose a later last day.",
      field: "endDate",
    });
  });

  it("refuses a missing city, and names the field", () => {
    const missing = { message: "The city is missing. Choose where you are going.", field: "cityPlaceId" };
    expect(refusal(trip("", START, START))).toEqual(missing);
    expect(refusal(trip(null, START, START))).toEqual(missing);
  });

  it("refuses a first or last day that is missing or not a date", () => {
    expect(refusal(trip("hanoi", null, START)).message).toBe(
      "The first day is missing. Enter a date.",
    );
    expect(refusal(trip("hanoi", "23/10/2026", START)).message).toBe(
      "The first day is missing. Enter a date.",
    );
    expect(refusal(trip("hanoi", START, "")).message).toBe("The last day is missing. Enter a date.");
    expect(refusal(trip("hanoi", "2026-02-30", "2026-03-02")).message).toBe(
      "That date does not exist. Check it.",
    );
  });
});
