import type { PlaceSuggestion, PlacesProvider } from "@/core/ports/places-provider";
import { suggestionsFor } from "./suggestion-cache";

/**
 * Cities known the world over, which the front page offers before a city is
 * typed, when nothing yet says where the trip might go. A few from each part
 * of the world, so the list reads as the world on offer rather than one
 * corner of it. Each is written with its country, so the search takes the
 * one everybody means and not a Paris in Texas.
 */
const WORLD_CITIES: readonly string[] = [
  "Paris, France",
  "Tokyo, Japan",
  "New York, USA",
  "Sydney, Australia",
  "Rome, Italy",
  "Bangkok, Thailand",
  "Cape Town, South Africa",
  "Rio de Janeiro, Brazil",
];

/**
 * What the list is filed under in our own table: the cities themselves, as a
 * question with no words of its own. A change to the list is then a new
 * question, answered afresh rather than with the list as it was for up to a
 * day.
 */
const WORLD_KEY = `cities:world:${WORLD_CITIES.join("|")}`;

/**
 * The cities above, each as a search for cities finds it first, in their
 * order, leaving out any it finds nothing for. The same list whoever asks, so
 * it is asked for once a day for everybody, and costs a search for each city
 * a day and no more.
 */
export function worldCities(
  provider: PlacesProvider,
  now: Date = new Date(),
): Promise<readonly PlaceSuggestion[]> {
  return suggestionsFor(
    { query: WORLD_KEY, biasKey: "anywhere", size: WORLD_CITIES.length },
    async () => {
      const answers = await Promise.all(
        WORLD_CITIES.map((name) =>
          provider.search({ query: name, near: null, limit: 1, only: "cities", session: null }),
        ),
      );
      return answers.flatMap((found) => found.slice(0, 1));
    },
    now,
  );
}
