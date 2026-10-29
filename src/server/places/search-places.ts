import type {
  PlaceSearchRequest,
  PlaceSuggestion,
  PlacesProvider,
} from "@/core/ports/places-provider";
import type { RateLimitPolicy } from "../rate-limit/window";
import type { SuggestionCacheKey } from "./suggestion-cache";
import { cachedSuggestions, keepSuggestions, pointKey, suggestionsFor } from "./suggestion-cache";

/** What a typed search is counted under, whichever way it is asked. */
export const SEARCH_ROUTE = "places-search";

/**
 * An open endpoint in front of a metered API. The limit is set to stop a script
 * rather than a person: someone typing behind a debounce will not come close.
 */
export const SEARCH_POLICY: RateLimitPolicy = { windowSeconds: 60, maxRequests: 40 };

function biasKeyFor(request: PlaceSearchRequest): string {
  return request.near === null ? "anywhere" : pointKey(request.near);
}

/**
 * Asking for cities is a different question from asking for places, so the
 * narrowing is part of the key rather than something a cached answer to the
 * wider question could be handed back for. Cities are filed as "town" and
 * not the "city" they were filed as when a city was only what Google files
 * as one, so an answer kept from then, which could not find Hội An, is never
 * handed back as this one. Places are filed as "spot" and not the "place"
 * they were filed as when a search near a point only leaned towards it, so an
 * answer kept from then, which could put the same name in another country
 * first, is never handed back as one that looked within reach of the point.
 */
const KIND_KEYS = { cities: "town", areas: "area" } as const;

function queryKeyFor(request: PlaceSearchRequest): string {
  const kind = request.only === null ? "spot" : KIND_KEYS[request.only];
  return `${kind}:${request.query.trim().toLowerCase()}`;
}

function keyFor(request: PlaceSearchRequest): SuggestionCacheKey {
  return { query: queryKeyFor(request), biasKey: biasKeyFor(request), size: request.limit };
}

/**
 * A typed search as our own table answered it recently, or null when it has
 * not. Read only once the request has been counted and allowed, as every
 * places read is, and the provider, which is paid, is asked only on a miss.
 */
export function cachedSearch(
  request: PlaceSearchRequest,
  now: Date = new Date(),
): Promise<readonly PlaceSuggestion[] | null> {
  return cachedSuggestions(keyFor(request), now);
}

/**
 * The provider's answer to a typed search, kept for next time. Done after
 * the reply has gone, since nobody waiting on the answer needs it written.
 */
export function keepSearch(
  request: PlaceSearchRequest,
  suggestions: readonly PlaceSuggestion[],
  now: Date = new Date(),
): Promise<void> {
  return keepSuggestions(keyFor(request), suggestions, now);
}

/**
 * A typed search from our own table when it was asked recently, and otherwise
 * from the provider, kept before it is handed back. For a caller with nobody
 * watching a field for the answer, who can wait the moment the write takes;
 * the search field's own route keeps it after replying instead.
 */
export function searchPlaces(
  request: PlaceSearchRequest,
  provider: PlacesProvider,
  now: Date = new Date(),
): Promise<readonly PlaceSuggestion[]> {
  return suggestionsFor(keyFor(request), () => provider.search(request), now);
}
