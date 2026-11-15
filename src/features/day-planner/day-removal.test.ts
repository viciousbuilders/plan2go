import { describe, expect, it } from "vitest";
import type { DayCity, DayPlan } from "@/core/model/day";
import type { Place } from "@/core/model/place";
import type { Stop } from "@/core/model/stop";
import { canReset, deleteQuestion, onTheDay, resetQuestion } from "./day-removal";
import { formatDayLong } from "./format-day-date";

const SYDNEY: DayCity = {
  providerPlaceId: "g-Sydney",
  name: "Sydney",
  position: { lat: -33.87, lng: 151.21 },
  color: 1,
};

function place(name: string): Place {
  return {
    id: `place-${name}`,
    providerPlaceId: `g-${name}`,
    name,
    address: null,
    position: { lat: -33.86, lng: 151.21 },
    openingHours: null,
  };
}

function stop(name: string): Stop {
  return { id: `stop-${name}`, place: place(name), stayMinutes: 60, travelMode: "walk", note: null };
}

function day(id: string, date: string, overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id,
    date,
    timeZone: "Australia/Sydney",
    label: null,
    start: null,
    end: null,
    startAtMinutes: 9 * 60,
    stops: [],
    endTravelMode: "walk",
    city: null,
    ...overrides,
  };
}

const HOTEL = { place: place("Hotel") };

/** Five days, 1 to 5 December 2026. */
const TRIP = [1, 2, 3, 4, 5].map((at) => day(`d${String(at)}`, `2026-12-0${String(at)}`));

describe("onTheDay and canReset", () => {
  it("lists the stops, then the start and end points", () => {
    const full = day("d1", "2026-12-01", {
      stops: [stop("Opera House"), stop("Harbour Bridge")],
      start: HOTEL,
      end: HOTEL,
    });
    expect(onTheDay(full)).toEqual(["the 2 stops on it", "its start point", "its end point"]);
  });

  it("offers nothing to reset on a day as a new day starts", () => {
    expect(canReset(day("d1", "2026-12-01"))).toBe(false);
  });

  it("offers a reset for a day that only leaves at another hour, or only ends somewhere", () => {
    expect(canReset(day("d1", "2026-12-01", { startAtMinutes: 8 * 60 }))).toBe(true);
    expect(canReset(day("d1", "2026-12-01", { end: HOTEL }))).toBe(true);
  });
});

describe("resetQuestion", () => {
  it("says everything that comes off, the hour it leaves at again, and that it stays in its city", () => {
    const full = day("d2", "2026-12-02", {
      stops: [stop("Opera House"), stop("Harbour Bridge"), stop("Barangaroo")],
      start: HOTEL,
      end: HOTEL,
      startAtMinutes: 8 * 60,
      city: SYDNEY,
    });
    expect(resetQuestion(full, 2)).toEqual({
      label: "Reset Day 2",
      question: "Reset Day 2?",
      detail:
        "The 3 stops on it, its start point and its end point come off, and it leaves at 09:00 again. It stays in Sydney. This cannot be undone.",
      cancel: "Cancel",
      does: "reset",
    });
  });

  it("says one thing coming off as one", () => {
    const one = day("d1", "2026-12-01", { stops: [stop("Opera House")] });
    expect(resetQuestion(one, 1).detail).toBe("The stop on it comes off. This cannot be undone.");
  });

  it("says only the hour when only the hour changes", () => {
    const early = day("d1", "2026-12-01", { startAtMinutes: 7 * 60 + 30 });
    expect(resetQuestion(early, 1).detail).toBe(
      "It leaves at 09:00 again. This cannot be undone.",
    );
  });
});

describe("deleteQuestion", () => {
  it("names the day and what goes with it, which days move, and the new last date", () => {
    const days = TRIP.map((one) =>
      one.id === "d2" ? { ...one, stops: [stop("Opera House"), stop("Barangaroo")] } : one,
    );
    expect(deleteQuestion(days, 1)).toEqual({
      label: "Delete Day 2",
      question: "Delete Day 2?",
      detail: `Day 2, ${formatDayLong("2026-12-02")}, comes off the trip with the 2 stops on it. Days 3 to 5 each move a day earlier, and the trip ends on ${formatDayLong("2026-12-04")} instead of ${formatDayLong("2026-12-05")}. This cannot be undone.`,
      cancel: "Cancel",
      does: "delete",
    });
  });

  it("moves every other day a day earlier when the first goes", () => {
    expect(deleteQuestion(TRIP, 0).detail).toContain(
      "Days 2 to 5 each move a day earlier",
    );
    expect(deleteQuestion(TRIP.slice(0, 2), 0).detail).toContain("Day 2 moves a day earlier");
  });

  it("says one day or two moving as they are", () => {
    expect(deleteQuestion(TRIP, 3).detail).toContain("Day 5 moves a day earlier");
    expect(deleteQuestion(TRIP, 2).detail).toContain("Days 4 and 5 each move a day earlier");
  });

  it("moves no day when the last one goes, and says where the trip then ends", () => {
    expect(deleteQuestion(TRIP, 4).detail).toBe(
      `Day 5, ${formatDayLong("2026-12-05")}, comes off the trip. The trip then ends on ${formatDayLong("2026-12-04")}. This cannot be undone.`,
    );
  });

  it("offers a reset instead for a trip's only day with something on it", () => {
    const only = [day("d1", "2026-12-01", { stops: [stop("Opera House")] })];
    expect(deleteQuestion(only, 0)).toEqual({
      label: "Day 1 cannot be deleted",
      question: "Day 1 is the trip's only day",
      detail:
        "A trip keeps at least one day, so it cannot be deleted. Reset it instead? The stop on it comes off. This cannot be undone.",
      cancel: "Cancel",
      does: "reset",
    });
  });

  it("can only be put away for a trip's only day with nothing on it", () => {
    const only = [day("d1", "2026-12-01")];
    expect(deleteQuestion(only, 0)).toEqual({
      label: "Day 1 cannot be deleted",
      question: "Day 1 is the trip's only day",
      detail:
        "A trip keeps at least one day, so it cannot be deleted. To start over, delete the whole trip from the trip's menu.",
      cancel: "Close",
      does: null,
    });
  });
});
