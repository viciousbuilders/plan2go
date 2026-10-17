import { describe, expect, it } from "vitest";
import type { DayPlan } from "@/core/model/day";
import type { Place } from "@/core/model/place";
import type { PlaceSuggestion } from "@/core/ports/places-provider";
import { placeLines } from "./place-text";

function place(providerPlaceId: string, name: string): Place {
  return {
    id: `place-${providerPlaceId}`,
    providerPlaceId,
    name,
    address: null,
    position: { lat: 21.03, lng: 105.85 },
    openingHours: null,
  };
}

function day(id: string, stops: readonly Place[], start: Place | null = null): DayPlan {
  return {
    id,
    date: "2026-10-24",
    timeZone: "Asia/Ho_Chi_Minh",
    label: null,
    start: start === null ? null : { place: start, label: "Hotel" },
    end: null,
    startAtMinutes: 540,
    stops: stops.map((stopPlace, index) => ({
      id: `${id}-stop-${String(index)}`,
      place: stopPlace,
      stayMinutes: 60,
      travelMode: "walk",
      note: null,
    })),
    endTravelMode: "walk",
    city: null,
  };
}

const temple: PlaceSuggestion = {
  providerPlaceId: "temple",
  name: "Temple of Literature",
  address: "58 Quoc Tu Giam, Dong Da, Hanoi",
  distanceMeters: 1800,
};

const lake: PlaceSuggestion = {
  providerPlaceId: "lake",
  name: "Hoan Kiem Lake",
  address: null,
  distanceMeters: null,
};

const hotel: PlaceSuggestion = {
  providerPlaceId: "hotel",
  name: "La Siesta Classic Ma May",
  address: "94 Ma May, Hoan Kiem, Hanoi",
  distanceMeters: 400,
};

describe("placeLines", () => {
  it("numbers each place with its address and identifier", () => {
    expect(placeLines([temple, lake], [])).toEqual([
      "1. Temple of Literature · 58 Quoc Tu Giam, Dong Da, Hanoi · place id temple",
      "2. Hoan Kiem Lake · place id lake",
    ]);
  });

  it("says which days a place is on already", () => {
    const days = [
      day("one", [place("temple", "Temple of Literature")]),
      day("two", []),
      day("three", [place("lake", "Hoan Kiem Lake"), place("temple", "Temple of Literature")]),
    ];
    expect(placeLines([temple, lake], days)).toEqual([
      "1. Temple of Literature · 58 Quoc Tu Giam, Dong Da, Hanoi · place id temple · already on Days 1 and 3",
      "2. Hoan Kiem Lake · place id lake · already on Day 3",
    ]);
  });

  it("counts where a day starts as being on the trip", () => {
    const stay = place("hotel", "La Siesta Classic Ma May");
    const days = [day("one", [], stay), day("two", [], stay), day("three", [], stay)];
    expect(placeLines([hotel], days)).toEqual([
      "1. La Siesta Classic Ma May · 94 Ma May, Hoan Kiem, Hanoi · place id hotel · already on Days 1, 2 and 3",
    ]);
  });
});
