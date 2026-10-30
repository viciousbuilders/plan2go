import { describe, expect, it } from "vitest";
import type { DayCity, DayPlan } from "@/core/model/day";
import type { LatLng, Place } from "@/core/model/place";
import type { Stop } from "@/core/model/stop";
import { endSearchWords, nearestPoint } from "./day-ends";

const PARIS: DayCity = {
  providerPlaceId: "g-paris",
  name: "Paris",
  position: { lat: 48.8566, lng: 2.3522 },
  color: 0,
};
const OPERA: LatLng = { lat: 48.8719, lng: 2.3316 };
const LOUVRE: LatLng = { lat: 48.8606, lng: 2.3376 };

function place(name: string, position: LatLng): Place {
  return {
    id: `place-${name}`,
    providerPlaceId: null,
    name,
    address: null,
    position,
    openingHours: null,
  };
}

function stop(name: string, position: LatLng): Stop {
  return {
    id: `stop-${name}`,
    place: place(name, position),
    stayMinutes: 60,
    travelMode: "walk",
    note: null,
  };
}

function day(overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id: "day-1",
    date: "2026-10-29",
    timeZone: "Europe/Paris",
    label: null,
    start: null,
    end: null,
    startAtMinutes: 9 * 60,
    stops: [],
    endTravelMode: "walk",
    city: PARIS,
    ...overrides,
  };
}

describe("nearestPoint", () => {
  it("looks near the first stop of the day", () => {
    const planned = day({ start: { place: place("Hotel", OPERA) }, stops: [stop("Louvre", LOUVRE)] });
    expect(nearestPoint(planned)).toEqual(LOUVRE);
  });

  it("looks near where the day starts when it has no stops", () => {
    expect(nearestPoint(day({ start: { place: place("Hotel", OPERA) } }))).toEqual(OPERA);
  });

  it("looks in the day's own city when nothing is on the day yet", () => {
    expect(nearestPoint(day())).toEqual(PARIS.position);
  });

  it("has nothing to go on with nothing on the day and no city", () => {
    expect(nearestPoint(day({ city: null }))).toBeNull();
  });
});

describe("endSearchWords", () => {
  it("says the search is finding where the day starts", () => {
    const words = endSearchWords("start", "Day 2");
    expect(words.heading).toBe("where Day 2 starts");
    expect(words.add("The Old Clare Hotel")).toBe("Start Day 2 at The Old Clare Hotel");
    expect(words.title).toBe("Start Day 2 here");
    expect(words.busy).toBe("Starting Day 2 here");
    expect(words.done("The Old Clare Hotel")).toBe("Day 2 now starts at The Old Clare Hotel");
  });

  it("says the search is finding where the day ends", () => {
    const words = endSearchWords("end", "Day 1");
    expect(words.heading).toBe("where Day 1 ends");
    expect(words.add("Central Station")).toBe("End Day 1 at Central Station");
    expect(words.title).toBe("End Day 1 here");
    expect(words.busy).toBe("Ending Day 1 here");
    expect(words.done("Central Station")).toBe("Day 1 now ends at Central Station");
  });
});
