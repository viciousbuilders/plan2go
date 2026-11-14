import { describe, expect, it } from "vitest";
import { cityKey } from "@/core/model/city-colors";
import type { DayCity, DayPlan } from "@/core/model/day";
import type { Trip } from "@/core/model/trip";
import type { DaySwap, DaysSwapped, TripRepository } from "../repositories/trip-repository";
import { swapDays } from "./swap-days";

const NOT_STUBBED = "This stub only answers the swap question.";

const SLUG = "amber-quay-4k7n2q9mrv";
const HASH = "b7f1c0d4e5a6";

function city(name: string, color: number): DayCity {
  return { providerPlaceId: `g-${name}`, name, position: { lat: -35.28, lng: 149.13 }, color };
}

const CANBERRA = city("Canberra", 0);
const SYDNEY = city("Sydney", 1);

function day(id: string, at: DayCity): DayPlan {
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

const TRIP: Trip = {
  id: "trip-1",
  slug: SLUG,
  title: "Canberra and Sydney",
  timeZone: "Australia/Sydney",
  userId: null,
  centre: null,
  cityName: null,
  days: [day("d1", CANBERRA), day("d2", CANBERRA), day("d3", CANBERRA), day("d4", SYDNEY)],
};

/** Records each swap it is asked for, and answers reads from the trip it was given. */
function repositoryFor(
  trip: Trip | null,
  answer: DaysSwapped = { status: "swapped" },
): { readonly repository: TripRepository; readonly swaps: DaySwap[] } {
  const swaps: DaySwap[] = [];
  const unstubbed = (): Promise<never> => Promise.reject(new Error(NOT_STUBBED));
  return {
    swaps,
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
      swapDays: (swap) => {
        swaps.push(swap);
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

describe("swapDays", () => {
  it("swaps the two days, with every city's colour as it is shown", async () => {
    const { repository, swaps } = repositoryFor(TRIP);
    const swapped = await swapDays(
      { slug: SLUG, editKeyHash: HASH, dayId: "d2", withDayId: "d4" },
      repository,
    );

    expect(swapped).toEqual({ status: "swapped" });
    expect(swaps).toEqual([
      {
        slug: SLUG,
        editKeyHash: HASH,
        dayId: "d2",
        withDayId: "d4",
        colors: { [cityKey(CANBERRA)]: 0, [cityKey(SYDNEY)]: 1 },
      },
    ]);
  });

  it("says what storage says when the key is not this trip's", async () => {
    const { repository } = repositoryFor(TRIP, { status: "refused" });
    const swapped = await swapDays(
      { slug: SLUG, editKeyHash: "not-the-key", dayId: "d2", withDayId: "d4" },
      repository,
    );
    expect(swapped).toEqual({ status: "refused" });
  });

  it("moves nothing for a day that is not on the trip", async () => {
    const { repository, swaps } = repositoryFor(TRIP);
    const swapped = await swapDays(
      { slug: SLUG, editKeyHash: HASH, dayId: "d2", withDayId: "day-on-another-trip" },
      repository,
    );
    expect(swapped).toEqual({ status: "refused" });
    expect(swaps).toEqual([]);
  });

  it("moves nothing for the same day twice", async () => {
    const { repository, swaps } = repositoryFor(TRIP);
    const swapped = await swapDays(
      { slug: SLUG, editKeyHash: HASH, dayId: "d2", withDayId: "d2" },
      repository,
    );
    expect(swapped).toEqual({ status: "refused" });
    expect(swaps).toEqual([]);
  });

  it("moves nothing on a trip that is not there", async () => {
    const { repository, swaps } = repositoryFor(null);
    const swapped = await swapDays(
      { slug: SLUG, editKeyHash: HASH, dayId: "d2", withDayId: "d4" },
      repository,
    );
    expect(swapped).toEqual({ status: "refused" });
    expect(swaps).toEqual([]);
  });
});
