import { describe, expect, it } from "vitest";
import { MAX_STOP_DAYS, MAX_STOPS, MAX_TRIP_DAYS } from "@/core/model/trip";
import { newTripInputSchema } from "./new-trip-input";

const START = "2026-10-08";

function trip(stops: readonly { cityPlaceId: unknown; days: unknown }[], startDate: unknown = START) {
  return newTripInputSchema.safeParse({ stops, startDate });
}

function firstMessage(result: ReturnType<typeof trip>): string | undefined {
  return result.error?.issues[0]?.message;
}

describe("newTripInputSchema", () => {
  it("takes the stops in order, days as the form sends them", () => {
    const result = trip([
      { cityPlaceId: "hanoi", days: "2" },
      { cityPlaceId: "ninh-binh", days: "1" },
    ]);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      stops: [
        { cityPlaceId: "hanoi", days: 2 },
        { cityPlaceId: "ninh-binh", days: 1 },
      ],
      startDate: START,
    });
  });

  it("refuses a trip with no stops, and says what to do", () => {
    expect(firstMessage(trip([]))).toBe(
      "The trip has no stops yet. Type a city and choose it from the list.",
    );
  });

  it("refuses more stops than a trip starts with", () => {
    const stops = Array.from({ length: MAX_STOPS + 1 }, (_unused, index) => ({
      cityPlaceId: `city-${String(index)}`,
      days: "1",
    }));
    expect(firstMessage(trip(stops))).toBe(
      "A trip starts with 12 stops at most. Add the rest from inside the trip.",
    );
  });

  it("refuses a stop of no days, or of more than a stop is given", () => {
    const message = "A stop runs 1 to 30 days. Change its days and try again.";
    expect(firstMessage(trip([{ cityPlaceId: "hanoi", days: "0" }]))).toBe(message);
    expect(firstMessage(trip([{ cityPlaceId: "hanoi", days: String(MAX_STOP_DAYS + 1) }]))).toBe(
      message,
    );
    expect(firstMessage(trip([{ cityPlaceId: "hanoi", days: "1.5" }]))).toBe(message);
    expect(firstMessage(trip([{ cityPlaceId: "hanoi", days: undefined }]))).toBe(message);
  });

  it("refuses a stop with no city", () => {
    expect(firstMessage(trip([{ cityPlaceId: " ", days: "2" }]))).toBe(
      "A stop has no city. Remove it and add the city again.",
    );
  });

  it("never opens a trip longer than a trip may run, however full", () => {
    expect(MAX_STOPS * MAX_STOP_DAYS).toBeLessThanOrEqual(MAX_TRIP_DAYS);
    const stops = Array.from({ length: MAX_STOPS }, (_unused, index) => ({
      cityPlaceId: `city-${String(index)}`,
      days: String(MAX_STOP_DAYS),
    }));
    expect(trip(stops).success).toBe(true);
  });

  it("refuses a departure that is missing or not a date", () => {
    const stops = [{ cityPlaceId: "hanoi", days: "2" }];
    expect(firstMessage(trip(stops, null))).toBe(
      "The day the trip departs is missing. Choose a date.",
    );
    expect(firstMessage(trip(stops, "2026-02-30"))).toBe("That date does not exist. Check it.");
  });
});
