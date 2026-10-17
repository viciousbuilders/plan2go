import { describe, expect, it } from "vitest";
import type { DayCity, DayPlan } from "@/core/model/day";
import type { LegResolution, TravelMode, TravelRequest } from "@/core/model/leg";
import type { LatLng, Place, WeeklyOpeningHours } from "@/core/model/place";
import type { Stop } from "@/core/model/stop";
import type { Trip } from "@/core/model/trip";
import type { TravelProvider } from "@/core/ports/travel-provider";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { tripText } from "./trip-text";

const ALL_DAY: WeeklyOpeningHours = {
  0: [{ opensAt: 480, closesAt: 1020 }],
  1: [{ opensAt: 480, closesAt: 1020 }],
  2: [{ opensAt: 480, closesAt: 1020 }],
  3: [{ opensAt: 480, closesAt: 1020 }],
  4: [{ opensAt: 480, closesAt: 1020 }],
  5: [{ opensAt: 480, closesAt: 1020 }],
  6: [{ opensAt: 480, closesAt: 1020 }],
};

/** Shuts at 11:30 on a Saturday, and keeps no other hours anyone wrote down. */
const SATURDAY_MORNING: WeeklyOpeningHours = {
  0: [],
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [{ opensAt: 480, closesAt: 690 }],
};

function place(
  id: string,
  name: string,
  position: LatLng,
  openingHours: WeeklyOpeningHours | null = null,
): Place {
  return { id, providerPlaceId: id, name, address: null, position, openingHours };
}

const hotel = place("hotel", "La Siesta Classic Ma May", { lat: 21.0345, lng: 105.8521 });
const temple = place("temple", "Temple of Literature", { lat: 21.0294, lng: 105.8355 }, ALL_DAY);
const prison = place("prison", "Hoa Lo Prison", { lat: 21.0253, lng: 105.8465 }, SATURDAY_MORNING);
const trangAn = place("trang-an", "Trang An", { lat: 20.2547, lng: 105.8936 });
const baiDinh = place("bai-dinh", "Bai Dinh Pagoda", { lat: 20.2742, lng: 105.8647 });
const nightMarket = place("night-market", "Hanoi Night Market", { lat: 21.0365, lng: 105.8508 });
const pubStreet = place("pub-street", "Ta Hien Street", { lat: 21.0378, lng: 105.8521 });

const hanoi: DayCity = {
  providerPlaceId: "hanoi",
  name: "Hanoi",
  position: { lat: 21.0285, lng: 105.8542 },
  color: 0,
};

const ninhBinh: DayCity = {
  providerPlaceId: "ninh-binh",
  name: "Ninh Binh",
  position: { lat: 20.2506, lng: 105.9745 },
  color: 1,
};

function stop(
  id: string,
  at: Place,
  stayMinutes: number,
  travelMode: TravelMode,
  note: string | null = null,
): Stop {
  return { id, place: at, stayMinutes, travelMode, note };
}

function day(fields: Partial<DayPlan> & Pick<DayPlan, "id" | "date">): DayPlan {
  return {
    timeZone: "Asia/Ho_Chi_Minh",
    label: null,
    start: null,
    end: null,
    startAtMinutes: 540,
    stops: [],
    endTravelMode: "walk",
    city: hanoi,
    ...fields,
  };
}

function trip(days: readonly DayPlan[]): Trip {
  return {
    id: "trip",
    slug: "teal-pier-23456789ab",
    title: "Hanoi and Ninh Binh",
    timeZone: "Asia/Ho_Chi_Minh",
    userId: null,
    centre: hanoi.position,
    cityName: hanoi.name,
    days,
  };
}

const NO_ROUTE: LegResolution = { status: "unresolved", reason: "no-route" };

/** Every leg's answers, by the names of its two ends and the way it is travelled. */
const ANSWERS: Readonly<Record<string, LegResolution>> = {
  "hotel>temple:walk": google("walk", 15, 1200),
  "hotel>temple:drive": google("drive", 6, 1900),
  "hotel>temple:transit": NO_ROUTE,
  "temple>prison:transit": {
    status: "resolved",
    estimate: {
      mode: "transit",
      durationMinutes: 25,
      distanceMeters: 3400,
      source: "google-routes",
      path: null,
      rides: [
        {
          vehicle: "bus",
          line: "09",
          headsign: "Long Bien",
          boardAt: "Van Mieu",
          alightAt: "Hoan Kiem",
          stops: 6,
          durationMinutes: 14,
        },
      ],
    },
  },
  "temple>prison:drive": google("drive", 9, 2600),
  "temple>prison:walk": google("walk", 41, 3100),
  "prison>hotel:drive": {
    status: "resolved",
    estimate: {
      mode: "drive",
      durationMinutes: 9,
      distanceMeters: 2100,
      source: "haversine",
      path: null,
      rides: null,
    },
  },
  "prison>hotel:transit": google("transit", 20, 2300),
  "prison>hotel:walk": google("walk", 28, 2200),
  "trang-an>bai-dinh:transit": NO_ROUTE,
  "trang-an>bai-dinh:drive": google("drive", 30, 18000),
  "trang-an>bai-dinh:walk": NO_ROUTE,
  "night-market>pub-street:walk": google("walk", 10, 600),
  "night-market>pub-street:drive": google("drive", 5, 900),
  "night-market>pub-street:transit": NO_ROUTE,
};

function google(mode: TravelMode, durationMinutes: number, distanceMeters: number): LegResolution {
  return {
    status: "resolved",
    estimate: { mode, durationMinutes, distanceMeters, source: "google-routes", path: null, rides: null },
  };
}

const PLACES = [hotel, temple, prison, trangAn, baiDinh, nightMarket, pubStreet];

function nameAt(position: LatLng): string {
  return PLACES.find((candidate) => candidate.position === position)?.id ?? "nowhere";
}

const travel: TravelProvider = {
  name: "answers",
  estimate: (request: TravelRequest) =>
    Promise.resolve(
      ANSWERS[`${nameAt(request.from)}>${nameAt(request.to)}:${request.mode}`] ?? NO_ROUTE,
    ),
};

const LINK = "https://plan2go.vietbrosinaus.com/t/teal-pier-23456789ab";

describe("tripText", () => {
  it("writes the trip out day by day, with its legs, hours, notes and conflicts", async () => {
    const days = [
      day({
        id: "one",
        date: "2026-10-24",
        startAtMinutes: 510,
        start: { place: hotel, label: "Hotel" },
        end: { place: hotel, label: "Hotel" },
        stops: [
          stop("s1", temple, 90, "walk", "Buy tickets at the south gate"),
          stop("s2", prison, 60, "transit"),
        ],
        endTravelMode: "drive",
      }),
      day({ id: "two", date: "2026-10-25" }),
      day({
        id: "three",
        date: "2026-10-26",
        city: ninhBinh,
        stops: [stop("s3", trangAn, 120, "walk"), stop("s4", baiDinh, 90, "transit")],
      }),
    ];
    const planned = await computeTrip(trip(days), travel);

    expect(tripText(trip(days), planned, LINK)).toBe(
      [
        "Hanoi and Ninh Binh",
        "24 - 26 Oct · 3 days",
        "Hanoi 24 - 25 Oct, then Ninh Binh 26 Oct",
        "All times are local time in Asia/Ho_Chi_Minh.",
        "Read only link: https://plan2go.vietbrosinaus.com/t/teal-pier-23456789ab",
        "",
        "Day 1 · Saturday 24 October 2026 · Hanoi",
        "Leave 08:30 · Back by 11:49 · 2 stops · Travelling 49 min",
        "08:30        Leave from Hotel, La Siesta Classic Ma May",
        "             Walk 15 min · 1.2 km",
        "             Other ways: Drive 6 min, Public transport unavailable",
        "08:45-10:15  Stop 1: Temple of Literature (1 hr 30 min)",
        "             Open 08:00-17:00",
        "             Note: Buy tickets at the south gate",
        "             Public transport 25 min · 3.4 km",
        "             Bus 09 towards Long Bien · Van Mieu to Hoan Kiem · 6 stops · 14 min",
        "             Other ways: Drive 9 min, Walk 41 min",
        "10:40-11:40  Stop 2: Hoa Lo Prison (1 hr)",
        "             Open 08:00-11:30",
        "             Conflict: Closes at 11:30 and you are still there at 11:40.",
        "             Drive about 9 min · 2.1 km",
        "             No drive route was found here. The time is a guess from the distance.",
        "             Other ways: Public transport 20 min, Walk 28 min",
        "11:49        Back at Hotel, La Siesta Classic Ma May",
        "",
        "Day 2 · Sunday 25 October 2026 · Hanoi",
        "Nothing planned yet.",
        "",
        "Day 3 · Monday 26 October 2026 · Ninh Binh",
        "Leave 09:00 · 2 stops",
        "09:00-11:00  Stop 1: Trang An (2 hr)",
        "             No public transport at this time.",
        "             Conflict: Could not work out the travel time from Trang An to Bai Dinh Pagoda. Nothing after it is timed.",
        "             Other ways: Drive 30 min, Walk unavailable",
        "             Stop 2: Bai Dinh Pagoda (1 hr 30 min), not timed",
      ].join("\n"),
    );
  });

  it("gives a stop passed by the one time it is passed at", async () => {
    const days = [
      day({
        id: "passing",
        date: "2026-10-24",
        stops: [stop("s1", nightMarket, 0, "walk"), stop("s2", pubStreet, 30, "walk")],
      }),
    ];
    const planned = await computeTrip(trip(days), travel);

    expect(tripText(trip(days), planned, LINK).split("\n").slice(8)).toEqual([
      "09:00        Stop 1: Hanoi Night Market (0 min)",
      "             Walk 10 min · 600 m",
      "             Other ways: Drive 5 min, Public transport unavailable",
      "09:10-09:40  Stop 2: Ta Hien Street (30 min)",
    ]);
  });

  it("says which day a time falls on once the day runs past midnight", async () => {
    const days = [
      day({
        id: "late",
        date: "2026-10-24",
        startAtMinutes: 1380,
        stops: [stop("s1", nightMarket, 90, "walk"), stop("s2", pubStreet, 30, "walk")],
      }),
    ];
    const planned = await computeTrip(trip(days), travel);

    // The day, after the trip's five lines of heading and the gap under them.
    expect(tripText(trip(days), planned, LINK).split("\n").slice(6)).toEqual([
      "Day 1 · Saturday 24 October 2026 · Hanoi",
      "Leave 23:00 · Done by 01:10 next day · 2 stops · Travelling 10 min",
      "23:00-00:30 next day  Stop 1: Hanoi Night Market (1 hr 30 min)",
      "             Walk 10 min · 600 m",
      "             Other ways: Drive 5 min, Public transport unavailable",
      "00:40-01:10 next day  Stop 2: Ta Hien Street (30 min)",
    ]);
  });
});
