import { z } from "zod";
import type { PlaceSuggestion, PlacesProvider } from "@/core/ports/places-provider";
import { popularCitiesIn } from "./cities-to-visit";
import { suggestionsFor } from "./suggestion-cache";

/** Set by Vercel from the caller's address, as the country's two letters. Absent everywhere else. */
const GEO_COUNTRY_HEADER = "x-vercel-ip-country";

const countryCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);

/** Countries by the name an English address gives them, "Vietnam" for "VN". */
const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * Cities known the world over, for somebody nobody can place. Each is written
 * with its country, so the search takes the one everybody means and not a
 * Paris in Texas, and asked once a day for everybody, so it costs a search
 * for each and no more.
 */
const WORLD_FAMOUS: readonly string[] = [
  "Paris, France",
  "Tokyo, Japan",
  "New York, USA",
  "London, UK",
  "Rome, Italy",
  "Barcelona, Spain",
  "Bangkok, Thailand",
  "Sydney, Australia",
];

/** The question the world's list is filed under, which has no words or place of its own. */
const WORLD_KEY = "cities:world";

/**
 * The country a request came from, by the name an English address gives it,
 * or null where the platform does not say, which is everywhere but Vercel,
 * or says something that is not a country it can name.
 */
export function visitorCountry(headers: Headers): string | null {
  const code = countryCodeSchema.safeParse(headers.get(GEO_COUNTRY_HEADER));
  if (!code.success) {
    return null;
  }
  // A code with no country behind it is answered with the code itself.
  const name = COUNTRY_NAMES.of(code.data);
  return name === undefined || name === code.data ? null : name;
}

/** Each of the world's cities as the search finds it first, leaving out any it finds nothing for. */
function worldFamous(
  provider: PlacesProvider,
  now: Date,
): Promise<readonly PlaceSuggestion[]> {
  return suggestionsFor(
    { query: WORLD_KEY, biasKey: "anywhere", size: WORLD_FAMOUS.length },
    async () => {
      const answers = await Promise.all(
        WORLD_FAMOUS.map((name) =>
          provider.search({ query: name, near: null, limit: 1, only: "cities", session: null }),
        ),
      );
      return answers.flatMap((found) => found.slice(0, 1));
    },
    now,
  );
}

/** The cities offered on a ticket with none on it yet. */
export interface CitiesToStart {
  readonly cities: readonly PlaceSuggestion[];
}

/**
 * The cities worth starting a trip in, for a ticket with no city on it yet:
 * the best known in the country the request came from, the best known
 * first, and where that country is not known, or has no list, the cities
 * known the world over. None says how far it is: the place the request came
 * from is a guess at a town, which is not a point to measure from.
 *
 * Nothing is kept about who asked. The country is read from the request and
 * let go of, and the list is filed under the country's name and nothing else.
 */
export async function citiesToStart(
  headers: Headers,
  limit: number,
  provider: PlacesProvider,
  now: Date = new Date(),
): Promise<CitiesToStart> {
  const country = visitorCountry(headers);
  if (country !== null) {
    const popular = await popularCitiesIn(country, provider, now);
    if (popular.length > 0) {
      return {
        cities: popular.slice(0, limit).map((city) => ({ ...city, distanceMeters: null })),
      };
    }
  }
  const famous = await worldFamous(provider, now);
  return { cities: famous.slice(0, limit) };
}
