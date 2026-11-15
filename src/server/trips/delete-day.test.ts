import { describe, expect, it } from "vitest";
import { cityKey, settleCityColors } from "@/core/model/city-colors";
import type { DayCity, DayPlan } from "@/core/model/day";
import type { Trip } from "@/core/model/trip";
import type { DayDeleted, DayRemoval, TripRepository } from "../repositories/trip-repository";
import { deleteDay } from "./delete-day";

const NOT_STUBBED = "This stub only answers the day removal question.";

const SLUG = "amber-quay-4k7n2q9mrv";
const HASH = "b7f1c0d4e5a6";

function city(name: string, color: number): DayCity {
  return { providerPlaceId: `g-${name}`, name, position: { lat: -35.28, lng: 149.13 }, color };
}

function day(id: string, at: DayCity | null): DayPlan {
  return {
    id,
    date: "2026-12-01",
    timeZone: "Australia/Sydney",
    label: null,
    start: null,
    end: null,
    startAtMinutes: 9 * 60,
    stops: [],
    endTravelMode: "walk",
    city: at,
  };
}

function tripOf(days: readonly DayPlan[]): Trip {
  return {
    id: "trip-1",
    slug: SLUG,
    title: "Canberra and Sydney",
    timeZone: "Australia/Sydney",
    userId: null,
    centre: null,
    cityName: null,
    days,
  };
}

/** Records each removal it is asked for, answers reads from the trip it was given. */
function repositoryFor(
  trip: Trip | null,
  answer: DayDeleted = { status: "deleted" },
): { readonly repository: TripRepository; readonly removals: DayRemoval[] } {
  const removals: DayRemoval[] = [];
  const unstubbed = (): Promise<never> => Promise.reject(new Error(NOT_STUBBED));
  return {
    removals,
    repository: {
      findBySlug: () => Promise.resolve(trip),
      findEditKeyHash: unstubbed,
      create: unstubbed,
      updateSettings: unstubbed,
      delete: unstubbed,
      findPlaceByProviderId: unstubbed,
      addStop: unstubbed,
      setDayEndpoint: unstubbed,
      setDayStart: unstubbed,
      setDayCity: unstubbed,
      swapDays: unstubbed,
      clearDay: unstubbed,
      deleteDay: (removal) => {
        removals.push(removal);
        return Promise.resolve(answer);
      },
      setLegMode: unstubbed,
      updateStop: unstubbed,
      removeStop: unstubbed,
      moveStop: unstubbed,
      moveStopToDay: unstubbed,
    },
  };
}

const CANBERRA = city("Canberra", 0);
const SYDNEY = city("Sydney", 1);

describe("deleteDay", () => {
  it("takes the day off, with every city's colour as the days left show it", async () => {
    const { repository, removals } = repositoryFor(
      tripOf([day("d1", CANBERRA), day("d2", CANBERRA), day("d3", SYDNEY)]),
    );
    const deleted = await deleteDay({ slug: SLUG, editKeyHash: HASH, dayId: "d2" }, repository);

    expect(deleted).toEqual({ status: "deleted" });
    expect(removals).toEqual([
      {
        slug: SLUG,
        editKeyHash: HASH,
        dayId: "d2",
        colors: { [cityKey(CANBERRA)]: 0, [cityKey(SYDNEY)]: 1 },
      },
    ]);
  });

  it("gives up the colour of a city no day is in any more", async () => {
    const { repository, removals } = repositoryFor(
      tripOf([day("d1", CANBERRA), day("d2", SYDNEY)]),
    );
    await deleteDay({ slug: SLUG, editKeyHash: HASH, dayId: "d2" }, repository);
    expect(removals[0]?.colors).toEqual({ [cityKey(CANBERRA)]: 0 });
  });

  it("keeps every city's dot on a trip whose colours were never stored", async () => {
    // Worked out as the trip is read, in the order it reaches its cities:
    // Canberra first. With Day 1 gone the trip reaches Sydney first, and
    // left unstored, Sydney would take Canberra's colour.
    const shown = settleCityColors({}, [CANBERRA, SYDNEY, CANBERRA]);
    const { repository, removals } = repositoryFor(
      tripOf([
        day("d1", city("Canberra", shown[cityKey(CANBERRA)] ?? 0)),
        day("d2", city("Sydney", shown[cityKey(SYDNEY)] ?? 0)),
        day("d3", city("Canberra", shown[cityKey(CANBERRA)] ?? 0)),
      ]),
    );
    await deleteDay({ slug: SLUG, editKeyHash: HASH, dayId: "d1" }, repository);

    expect(settleCityColors({}, [SYDNEY, CANBERRA])[cityKey(SYDNEY)]).toBe(0);
    expect(removals[0]?.colors).toEqual(shown);
  });

  it("says what storage says about a trip's only day", async () => {
    const { repository } = repositoryFor(tripOf([day("d1", CANBERRA)]), { status: "only-day" });
    const deleted = await deleteDay({ slug: SLUG, editKeyHash: HASH, dayId: "d1" }, repository);
    expect(deleted).toEqual({ status: "only-day" });
  });

  it("says what storage says when the key is not this trip's", async () => {
    const { repository } = repositoryFor(
      tripOf([day("d1", CANBERRA), day("d2", SYDNEY)]),
      { status: "refused" },
    );
    const deleted = await deleteDay(
      { slug: SLUG, editKeyHash: "not-the-key", dayId: "d2" },
      repository,
    );
    expect(deleted).toEqual({ status: "refused" });
  });

  it("moves nothing for a day that is not on the trip, or a trip that is not there", async () => {
    const onTrip = repositoryFor(tripOf([day("d1", CANBERRA), day("d2", SYDNEY)]));
    expect(
      await deleteDay({ slug: SLUG, editKeyHash: HASH, dayId: "elsewhere" }, onTrip.repository),
    ).toEqual({ status: "refused" });
    expect(onTrip.removals).toEqual([]);

    const nowhere = repositoryFor(null);
    expect(
      await deleteDay({ slug: SLUG, editKeyHash: HASH, dayId: "d1" }, nowhere.repository),
    ).toEqual({ status: "refused" });
    expect(nowhere.removals).toEqual([]);
  });
});
