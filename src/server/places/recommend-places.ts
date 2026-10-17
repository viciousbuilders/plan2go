import type { LatLng } from "@/core/model/place";
import type { PlaceKind } from "@/core/model/place-kind";
import type { PlaceSuggestion, PlacesProvider } from "@/core/ports/places-provider";
import type { RateLimitPolicy } from "../rate-limit/window";
import { pointKey, suggestionsFor } from "./suggestion-cache";

/** What the city's best known of any kind is counted under, whichever way it is asked. */
export const POPULAR_ROUTE = "places-nearby";

/**
 * What the city is known for is asked once when the field is opened rather
 * than once per few letters, so a person reaches it a handful of times in a
 * sitting and anything asking more often is not one.
 */
export const POPULAR_POLICY: RateLimitPolicy = { windowSeconds: 60, maxRequests: 10 };

/** What the best known of one kind is counted under, whichever way it is asked. */
export const KIND_ROUTE = "places-kind";

/**
 * A kind is asked once for each quick search pressed, and there are ten quick
 * searches, so a reader looking through them all in a minute comes nowhere
 * near this. A script asking for every kind in every city does.
 */
export const KIND_POLICY: RateLimitPolicy = { windowSeconds: 60, maxRequests: 30 };

/**
 * As many as the provider will name for one question. The search panel asks
 * for this many, and so does anything else wanting the whole list, so a city's
 * list is one row in our own table however it was asked for.
 */
export const MOST_RECOMMENDED = 20;

/**
 * How far out from the middle of a city to look, in metres. Wide enough to
 * reach the edges of a large one, and short of the distance at which the answer
 * stops being about this city at all.
 */
const CITY_RADIUS_METERS = 15_000;

/**
 * The question has no words of its own, so it is filed under a fixed name for
 * what is asked, the city's best known or the best known of one kind, and told
 * apart by where it was asked. Two trips to the same city therefore share one
 * answer for each, and the second of them costs nothing.
 */
function queryKey(kind: PlaceKind | null): string {
  return kind === null ? "nearby:popular" : `kind:${kind}`;
}

/**
 * The best known places in the city a trip is in, for the field nobody has
 * typed in yet: what the city is known for, or with a quick search pressed,
 * the best known of that kind. Cached exactly as a typed search is, and by a
 * key coarse enough that every trip to a city asks the same question.
 */
export async function recommendPlaces(
  kind: PlaceKind | null,
  centre: LatLng,
  limit: number,
  provider: PlacesProvider,
  now: Date = new Date(),
): Promise<readonly PlaceSuggestion[]> {
  return suggestionsFor(
    { query: queryKey(kind), biasKey: pointKey(centre), size: limit },
    () => provider.nearby({ kind, centre, radiusMeters: CITY_RADIUS_METERS, limit }),
    now,
  );
}
