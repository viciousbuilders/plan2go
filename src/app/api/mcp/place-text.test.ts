import { describe, expect, it } from "vitest";
import type { DayPlan } from "@/core/model/day";
import type { Place, PlaceCard } from "@/core/model/place";
import type { PlaceSuggestion } from "@/core/ports/places-provider";
import { cityLines, placeCardText, placeLines, placeOnTrip } from "./place-text";

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

describe("placeOnTrip", () => {
  it("says every stop and every end of a day the place is, by the numbers the tools take", () => {
    const temple = place("temple", "Temple of Literature");
    const stay = place("hotel", "La Siesta Classic Ma May");
    const days = [
      day("one", [place("lake", "Hoan Kiem Lake"), temple], stay),
      day("two", [temple], stay),
    ];
    expect(placeOnTrip("temple", days)).toEqual(["Stop 2 on Day 1", "Stop 1 on Day 2"]);
    expect(placeOnTrip("hotel", days)).toEqual(["where Day 1 starts", "where Day 2 starts"]);
    expect(placeOnTrip("prison", days)).toEqual([]);
  });
});

const card: PlaceCard = {
  rating: 4.6,
  ratingCount: 12345,
  priceLevel: 1,
  summary: "Temple dedicated to Confucius, home to Vietnam's first university.",
  kind: "Historical landmark",
  website: "https://vanmieu.gov.vn/",
  phone: "024 3747 2566",
  mapsUrl: "https://maps.google.com/?cid=1",
  photos: [],
  reviews: [
    {
      author: "Mai Tran",
      authorUrl: null,
      rating: 5,
      when: "2 months ago",
      text: "Quiet in the early morning.\n\nGo before the tour buses.",
    },
    { author: "Sam Lee", authorUrl: null, rating: 3, when: "a year ago", text: null },
  ],
};

describe("placeCardText", () => {
  it("tells the place as the sheet does, with where it is on the trip and the reviews a line each", () => {
    expect(
      placeCardText(
        { name: "Temple of Literature", address: "58 Quoc Tu Giam, Dong Da, Hanoi" },
        card,
        ["Stop 2 on Day 1", "Stop 1 on Day 2"],
      ),
    ).toBe(
      [
        "Temple of Literature",
        "Historical landmark · 4.6 out of 5 from 12,345 ratings · Price level 1 of 4",
        "Temple dedicated to Confucius, home to Vietnam's first university.",
        "Address: 58 Quoc Tu Giam, Dong Da, Hanoi",
        "Website: https://vanmieu.gov.vn/",
        "Phone: 024 3747 2566",
        "Google Maps: https://maps.google.com/?cid=1",
        "On the trip: Stop 2 on Day 1 and Stop 1 on Day 2.",
        "",
        "What people say:",
        "- Mai Tran, 5 out of 5, 2 months ago: Quiet in the early morning. Go before the tour buses.",
        "- Sam Lee, 3 out of 5, a year ago",
        "",
        "Ratings and reviews from Google.",
      ].join("\n"),
    );
  });

  it("leaves out what Google does not know, says there are no reviews, and credits nothing it did not give", () => {
    const bare: PlaceCard = {
      ...card,
      rating: null,
      ratingCount: null,
      priceLevel: 0,
      summary: null,
      kind: null,
      website: null,
      phone: null,
      mapsUrl: null,
      reviews: [],
    };
    expect(placeCardText({ name: "Hoan Kiem Lake", address: null }, bare, [])).toBe(
      ["Hoan Kiem Lake", "Free", "", "Google has no reviews for this place."].join("\n"),
    );
  });
});

describe("cityLines", () => {
  it("numbers each city with how far it is and its identifier", () => {
    expect(
      cityLines([
        { providerPlaceId: "ninh-binh", name: "Ninh Binh", address: null, distanceMeters: 93_412 },
        { providerPlaceId: "ha-long", name: "Ha Long", address: "Vietnam", distanceMeters: null },
      ]),
    ).toEqual([
      "1. Ninh Binh · 93 km away · place id ninh-binh",
      "2. Ha Long · place id ha-long",
    ]);
  });
});
