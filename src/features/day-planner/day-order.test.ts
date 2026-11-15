import { describe, expect, it } from "vitest";
import type { DayCity, DayPlan } from "@/core/model/day";
import type { Stop } from "@/core/model/stop";
import { computeDay } from "@/core/time/compute-day";
import type { PlannedDay } from "./compute-trip";
import { arrangedDays, movedWithin, swappedOrder } from "./day-order";

function city(name: string): DayCity {
  return { providerPlaceId: `g-${name}`, name, position: { lat: -33.87, lng: 151.21 }, color: 0 };
}

function stop(name: string): Stop {
  return {
    id: `stop-${name}`,
    place: {
      id: `place-${name}`,
      providerPlaceId: `g-${name}`,
      name,
      address: null,
      position: { lat: -33.86, lng: 151.21 },
      openingHours: null,
    },
    stayMinutes: 90,
    travelMode: "walk",
    note: "Book ahead",
  };
}

function planned(id: string, date: string, overrides: Partial<DayPlan> = {}): PlannedDay {
  const plan: DayPlan = {
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
  return { plan, computed: computeDay({ day: plan, legs: [] }), legs: [] };
}

const DAYS = [
  planned("d1", "2026-12-01", { city: city("Canberra") }),
  planned("d2", "2026-12-02", { city: city("Canberra"), stops: [stop("Parliament House")] }),
  planned("d3", "2026-12-03", { city: city("Canberra") }),
  planned("d4", "2026-12-04", {
    city: city("Sydney"),
    stops: [stop("Opera House")],
    startAtMinutes: 8 * 60,
  }),
];

describe("swappedOrder", () => {
  it("puts the two days in each other's places and leaves the rest", () => {
    expect(swappedOrder(DAYS, 1, 3)).toEqual(["d1", "d4", "d3", "d2"]);
  });

  it("is the order as it is for a place past the end", () => {
    expect(swappedOrder(DAYS, 1, 9)).toEqual(["d1", "d2", "d3", "d4"]);
  });
});

describe("arrangedDays", () => {
  const arranged = arrangedDays(DAYS, ["d1", "d4", "d3", "d2"]);

  it("gives each day the date of the place it lands in", () => {
    expect(arranged.map((day) => [day.plan.id, day.plan.date, day.computed.date])).toEqual([
      ["d1", "2026-12-01", "2026-12-01"],
      ["d4", "2026-12-02", "2026-12-02"],
      ["d3", "2026-12-03", "2026-12-03"],
      ["d2", "2026-12-04", "2026-12-04"],
    ]);
  });

  it("keeps everything else on a day that moves", () => {
    const sydney = arranged[1];
    expect(sydney?.plan.city?.name).toBe("Sydney");
    expect(sydney?.plan.stops).toBe(DAYS[3]?.plan.stops);
    expect(sydney?.plan.startAtMinutes).toBe(8 * 60);
  });

  it("leaves the days that stay where they were as they were", () => {
    expect(arranged[0]).toBe(DAYS[0]);
    expect(arranged[2]).toBe(DAYS[2]);
  });

  it("changes nothing once the trip has caught up with the order", () => {
    const caughtUp = arrangedDays(arranged, ["d1", "d4", "d3", "d2"]);
    caughtUp.forEach((day, index) => {
      expect(day).toBe(arranged[index]);
    });
  });

  it("shows the days as they are when the trip changed under the order", () => {
    expect(arrangedDays(DAYS, ["d1", "d4", "d3"])).toBe(DAYS);
    expect(arrangedDays(DAYS, ["d1", "d4", "d3", "d5"])).toBe(DAYS);
    expect(arrangedDays(DAYS, ["d1", "d1", "d3", "d4"])).toBe(DAYS);
  });
});

describe("movedWithin", () => {
  const stops = ["a", "b", "c", "d"];

  it("puts an entry carried down the list in the place it was let go on", () => {
    expect(movedWithin(stops, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("puts an entry carried up the list in the place it was let go on", () => {
    expect(movedWithin(stops, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("leaves the list as it is for its own place or a place it does not have", () => {
    expect(movedWithin(stops, 2, 2)).toEqual(stops);
    expect(movedWithin(stops, 5, 1)).toBe(stops);
    expect(movedWithin(stops, 1, 4)).toBe(stops);
    expect(movedWithin(stops, 1, -1)).toBe(stops);
  });
});
