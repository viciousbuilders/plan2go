import type { DayPlan } from "./day";
import type { LatLng } from "./place";

export type TripId = string;

/**
 * A year. Long enough for anything anyone would plan a day at a time.
 *
 * Here rather than beside the input schema that enforces it, because the
 * form on the front door shows it too, and a client component that imports a
 * server module for one number takes that module's whole import tree into
 * the browser with it.
 */
export const MAX_TRIP_DAYS = 365;

/**
 * The most stops a trip is opened with from the front page. Each is a city
 * looked up with the place provider as the trip opens, so this is also how
 * many of those a single press can ask for. More cities are added from inside
 * the trip, a day at a time.
 */
export const MAX_STOPS = 12;

/** The most days one stop is given on the front page, where they are counted a press at a time. */
export const MAX_STOP_DAYS = 30;

export interface Trip {
  readonly id: TripId;
  /** Random, unguessable, and the only thing in the URL. */
  readonly slug: string;
  readonly title: string;
  readonly timeZone: string;
  /** Null until accounts exist. Present from day one so ownership can be added. */
  readonly userId: string | null;
  /**
   * The city the trip is in, so the map opens there instead of on the whole
   * world and a search knows which Central Market is meant. Null on trips
   * opened before anyone was asked where they were going.
   */
  readonly centre: LatLng | null;
  /**
   * What that city is called, for the places the product would rather name it
   * than point at it. Null wherever centre is null, and on trips opened before
   * anyone was asked.
   */
  readonly cityName: string | null;
  readonly days: readonly DayPlan[];
}
