import type { DayCity, IsoDate } from "@/core/model/day";
import { sameCity } from "@/core/model/day-city";
import { createEditKey, hashEditKey } from "../ownership/edit-key";
import type { TripRepository } from "../repositories/trip-repository";
import { DEFAULT_START_AT_MINUTES } from "./day-start";

/** What a trip is called until the traveller names it. */
export const UNTITLED = "Untitled trip";

/** A city a trip stops in, as the place provider answered for it. */
export type StopCity = Omit<DayCity, "color">;

/** One stop on the way: a city, and how many whole days are spent in it. */
export interface TripStop {
  readonly city: StopCity;
  readonly days: number;
}

export interface NewTripRequest {
  /** What the traveller calls the trip. A trip is not one city. */
  readonly title: string;
  readonly timeZone: string;
  readonly startDate: IsoDate;
  /**
   * The cities the trip goes to, in the order it goes, and how many days in
   * each. Never empty: the first is the trip's own city, where the map opens
   * and whose clock the trip keeps.
   */
  readonly stops: readonly [TripStop, ...TripStop[]];
}

export interface CreatedTripResult {
  readonly slug: string;
  /**
   * Goes into the edit link and nowhere else. This is the only moment it exists
   * in the clear, so a caller that loses it cannot ask for it again.
   */
  readonly editKey: string;
}

/**
 * The city each day of the trip is in, first day first, one entry a day. A
 * day in the trip's own city, the first stop's, is null, which is how storage
 * says a day is where the trip is, so coming back to it later in the trip
 * reads the same as never having left it.
 */
export function cityOfEachDay(
  stops: readonly [TripStop, ...TripStop[]],
): readonly (StopCity | null)[] {
  const home = stops[0].city;
  return stops.flatMap((stop) =>
    Array.from({ length: stop.days }, () => (sameCity(stop.city, home) ? null : stop.city)),
  );
}

/**
 * Opens a trip and hands back the one key that authorises changes to it. The
 * days come out empty: no stops, and neither end of any day set, because at
 * this point nobody knows where the traveller is staying or whether they are
 * staying anywhere at all. Both ends of a day are set from inside the planner.
 * What each day already knows is the city it is spent in.
 */
export async function createTrip(
  request: NewTripRequest,
  repository: TripRepository,
): Promise<CreatedTripResult> {
  const editKey = createEditKey();
  const { slug } = await repository.create({
    title: request.title,
    timeZone: request.timeZone,
    startDate: request.startDate,
    city: request.stops[0].city,
    dayCities: cityOfEachDay(request.stops),
    startAtMinutes: DEFAULT_START_AT_MINUTES,
    editKeyHash: hashEditKey(editKey),
  });
  return { slug, editKey };
}
