import { describe, expect, it } from "vitest";
import type { DayEndpoint, DayPlan } from "@/core/model/day";
import type { LegResolution, TravelRequest } from "@/core/model/leg";
import type { Place } from "@/core/model/place";
import type { Stop } from "@/core/model/stop";
import type { Trip } from "@/core/model/trip";
import type {
  LegModeUpdate,
  StopChanged,
  StopDayMove,
  StopMove,
  TripRepository,
} from "../repositories/trip-repository";
import { moveStopToDay } from "./edit-stop";
import type { TravelFor } from "./leg-modes";

const NOT_STUBBED = "This stub only answers moving a stop.";

const SLUG = "amber-quay-4k7n2q9mrv";
const HASH = "b7f1c0d4e5a6";

function place(id: string): Place {
  return {
    id,
    providerPlaceId: null,
    name: id,
    address: null,
    position: { lat: 21.0278, lng: 105.8342 },
    openingHours: null,
  };
}

function stop(id: string): Stop {
  return { id, place: place(id), stayMinutes: 60, travelMode: "walk", note: null };
}

const HOTEL: DayEndpoint = { place: place("hotel"), label: null };

function day(id: string, stops: readonly Stop[], overrides: Partial<DayPlan> = {}): DayPlan {
  return {
    id,
    date: "2026-11-07",
    timeZone: "Asia/Ho_Chi_Minh",
    label: null,
    start: null,
    end: null,
    startAtMinutes: 9 * 60,
    stops,
    endTravelMode: "walk",
    city: null,
    ...overrides,
  };
}

function tripOf(days: readonly DayPlan[]): Trip {
  return {
    id: "trip-1",
    slug: SLUG,
    title: "Untitled trip",
    timeZone: "Asia/Ho_Chi_Minh",
    userId: null,
    centre: null,
    cityName: null,
    days,
  };
}

const A = stop("a");
const B = stop("b");
const C = stop("c");
const D = stop("d");
const E = stop("e");

/** Keeps every move and every mode written, and answers reads from the trip it was given. */
function repositoryFor(
  trip: Trip,
  answer: StopChanged = { status: "changed" },
): {
  readonly repository: TripRepository;
  readonly dayMoves: StopDayMove[];
  readonly moves: StopMove[];
  readonly modes: LegModeUpdate[];
} {
  const dayMoves: StopDayMove[] = [];
  const moves: StopMove[] = [];
  const modes: LegModeUpdate[] = [];
  const unstubbed = (): Promise<never> => Promise.reject(new Error(NOT_STUBBED));
  return {
    dayMoves,
    moves,
    modes,
    repository: {
      findBySlug: () => Promise.resolve(trip),
      findEditKeyHash: unstubbed,
      findPlaceByProviderId: unstubbed,
      create: unstubbed,
      updateSettings: unstubbed,
      delete: unstubbed,
      addStop: unstubbed,
      setDayEndpoint: unstubbed,
      setDayStart: unstubbed,
      setDayCity: unstubbed,
      setLegMode: (update) => {
        modes.push(update);
        return Promise.resolve({ status: "set" });
      },
      updateStop: unstubbed,
      removeStop: unstubbed,
      moveStop: (move) => {
        moves.push(move);
        return Promise.resolve(answer);
      },
      moveStopToDay: (move) => {
        dayMoves.push(move);
        return Promise.resolve(answer);
      },
    },
  };
}

/** Every way answered, the drive the quickest. */
function driveFastest(request: TravelRequest): Promise<LegResolution> {
  const minutes = { walk: 40, drive: 12, transit: 25 } as const;
  return Promise.resolve({
    status: "resolved",
    estimate: {
      mode: request.mode,
      durationMinutes: minutes[request.mode],
      distanceMeters: 3000,
      source: "google-routes",
      path: null,
      rides: null,
    },
  });
}

const travelFor: TravelFor = () => Promise.resolve({ name: "stub", estimate: driveFastest });

/** The modes written, by day and by the stop each leg arrives at, in an order that does not depend on timing. */
function written(modes: readonly LegModeUpdate[]): readonly string[] {
  return modes.map(({ dayId, stopId, mode }) => `${dayId} ${stopId ?? "end"} ${mode}`).sort();
}

describe("moveStopToDay", () => {
  it("moves the stop and gives the quickest way to each leg either day now runs differently", async () => {
    const { repository, dayMoves, modes } = repositoryFor(
      tripOf([day("one", [A, B, C]), day("two", [D, E], { end: HOTEL })]),
    );

    await moveStopToDay(
      { slug: SLUG, editKeyHash: HASH, stopId: "b", dayId: "two", toPosition: 1 },
      repository,
      travelFor,
    );

    expect(dayMoves).toEqual([
      { slug: SLUG, editKeyHash: HASH, stopId: "b", dayId: "two", toPosition: 1 },
    ]);
    // C now comes from A. On the second day B comes from D and E from B, and
    // the way to the hotel still leaves E, so whatever was chosen for it stands.
    expect(written(modes)).toEqual(["one c drive", "two b drive", "two e drive"]);
  });

  it("puts the stop last for a place past the end of the day, and relays the way out from it", async () => {
    const { repository, dayMoves, modes } = repositoryFor(
      tripOf([day("one", [A, B, C]), day("two", [D, E], { end: HOTEL })]),
    );

    await moveStopToDay(
      { slug: SLUG, editKeyHash: HASH, stopId: "b", dayId: "two", toPosition: 9 },
      repository,
      travelFor,
    );

    // The place goes to storage as asked, which keeps it inside the day too.
    expect(dayMoves[0]?.toPosition).toBe(9);
    expect(written(modes)).toEqual(["one c drive", "two b drive", "two end drive"]);
  });

  it("says nothing of the way to a stop that becomes a day's first with nothing before it", async () => {
    const { repository, modes } = repositoryFor(
      tripOf([day("one", [A, B, C]), day("two", [D, E])]),
    );

    await moveStopToDay(
      { slug: SLUG, editKeyHash: HASH, stopId: "c", dayId: "two", toPosition: 0 },
      repository,
      travelFor,
    );

    // C left the end of the first day, which closes nothing over it, and
    // on the second day only D has a new way in.
    expect(written(modes)).toEqual(["two d drive"]);
  });

  it("changes no way of travelling when the key is refused", async () => {
    const { repository, modes } = repositoryFor(
      tripOf([day("one", [A, B, C]), day("two", [D, E])]),
      { status: "refused" },
    );

    const moved = await moveStopToDay(
      { slug: SLUG, editKeyHash: HASH, stopId: "b", dayId: "two", toPosition: 0 },
      repository,
      travelFor,
    );

    expect(moved).toEqual({ status: "refused" });
    expect(modes).toEqual([]);
  });

  it("moves the stop within its day when the day named is the one it is on", async () => {
    const { repository, dayMoves, moves, modes } = repositoryFor(
      tripOf([day("one", [A, B, C]), day("two", [D, E])]),
    );

    await moveStopToDay(
      { slug: SLUG, editKeyHash: HASH, stopId: "a", dayId: "one", toPosition: 2 },
      repository,
      travelFor,
    );

    expect(dayMoves).toEqual([]);
    expect(moves).toEqual([{ slug: SLUG, editKeyHash: HASH, stopId: "a", toPosition: 2 }]);
    // B, C, A: B now opens the day with nothing before it and C still comes
    // from B, so the way into A is the one leg with new ends.
    expect(written(modes)).toEqual(["one a drive"]);
  });
});
