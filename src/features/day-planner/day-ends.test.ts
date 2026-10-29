import { describe, expect, it } from "vitest";
import type { DayCity, DayPlan } from "@/core/model/day";
import type { LatLng, Place } from "@/core/model/place";
import type { Stop } from "@/core/model/stop";
import { nearestPoint } from "./day-ends";

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
