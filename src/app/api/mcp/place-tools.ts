import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createGooglePlacesProvider } from "@/adapters/places/google-places";
import type { PlaceKind } from "@/core/model/place-kind";
import { PLACE_KINDS } from "@/core/model/place-kind";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import type { PlacesProvider } from "@/core/ports/places-provider";
import { cityListWords } from "@/features/place-search/place-kinds";
import { searchBias } from "@/features/place-search/search-bias";
import { googleMapsApiKey } from "@/server/places/google-key";
import {
  KIND_POLICY,
  KIND_ROUTE,
  MOST_RECOMMENDED,
  POPULAR_POLICY,
  POPULAR_ROUTE,
  recommendPlaces,
} from "@/server/places/recommend-places";
import { SEARCH_POLICY, SEARCH_ROUTE, searchPlaces } from "@/server/places/search-places";
import type { RateLimitPolicy } from "@/server/rate-limit/window";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { placeLines } from "./place-text";
import { answer, guarded, NO_PLACE_SEARCH, overBudget, refuse } from "./tool-call";
import { NO_SUCH_TRIP, noSuchDay, NOT_A_TRIP_LINK, slugFromLink } from "./trip-link";

/**
 * As many as one typed search answers with, and what the planner's search
 * field and the front page ask for, so a search asked here and there is one
 * row in our own table.
 */
const SEARCHED = 5;

const SEARCHING = { many: "searches", again: "search again" };

/** The places provider, or null on a server with no key, where nothing can be searched. */
function placesProvider(): PlacesProvider | null {
  const apiKey = googleMapsApiKey();
  return apiKey === null ? null : createGooglePlacesProvider({ apiKey });
}

/**
 * Which budget a look for places is counted against: a typed search's, or the
 * city's best known of a kind or of any, as the planner's routes count them.
 */
function budgetFor(
  search: string | undefined,
  kind: PlaceKind | undefined,
): { readonly route: string; readonly policy: RateLimitPolicy } {
  if (search !== undefined) {
    return { route: SEARCH_ROUTE, policy: SEARCH_POLICY };
  }
  return kind === undefined
    ? { route: POPULAR_ROUTE, policy: POPULAR_POLICY }
    : { route: KIND_ROUTE, policy: KIND_POLICY };
}

/**
 * Looking for cities and for places, through the same cached searches as the
 * front page and the planner's search field, and counted against the same
 * budgets by address. Reads, so neither asks for an editing link.
 */
export function registerPlaceTools(server: McpServer): void {
  server.registerTool(
    "find_cities",
    {
      title: "Find a city",
      description:
        "Look up cities by name, with the same search as the stop field on the plan2go front page. Each city comes with the country it is in, which tells two cities of the same name apart, and its place id.",
      inputSchema: z.object({
        name: z
          .string()
          .trim()
          .min(2)
          .max(100)
          .describe("The city's name, or at least its first two letters."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ name }, ctx) =>
      guarded(
        "MCP find_cities failed",
        "Could not reach the place search service. Try again in a moment.",
        async () => {
          const over = await overBudget(ctx, SEARCH_ROUTE, SEARCH_POLICY, SEARCHING);
          if (over !== null) {
            return over;
          }
          const provider = placesProvider();
          if (provider === null) {
            return refuse(NO_PLACE_SEARCH);
          }

          const found = await searchPlaces(
            { query: name, near: null, limit: SEARCHED, session: null, only: "cities" },
            provider,
          );
          if (found.length === 0) {
            return answer("No city matches that. Check the spelling.");
          }
          return answer([`Cities that match "${name}":`, ...placeLines(found, [])].join("\n"));
        },
      ),
  );

  server.registerTool(
    "find_places",
    {
      title: "Find places for a day",
      description:
        'Look for places to visit on one day of a plan2go trip, in the city that day is spent in. Give a search, such as "pho" or "Temple of Literature", or a kind of place, or neither for what the city is best known for. Each place comes with its address and place id, and a place already on the trip says which days it is on.',
      inputSchema: z.object({
        link: z
          .string()
          .min(1)
          .max(500)
          .describe(
            "The trip's read only link, /t/<slug>. Its editing link works too, but nothing here needs the key in it.",
          ),
        day: z
          .number()
          .int()
          .min(1)
          .max(MAX_TRIP_DAYS)
          .describe("Which day of the trip, counting the first as 1."),
        search: z
          .string()
          .trim()
          .min(2)
          .max(100)
          .optional()
          .describe(
            "Words to search for, at least two letters: a name, a dish, a street. Leave out for what the city is known for.",
          ),
        kind: z.enum(PLACE_KINDS).optional().describe("A kind of place to list, instead of a search."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ link, day, search, kind }, ctx) =>
      guarded(
        "MCP find_places failed",
        "Could not reach the place search service. Your trip is saved, try again in a moment.",
        async () => {
          if (search !== undefined && kind !== undefined) {
            return refuse("Give a search or a kind of place, not both.");
          }
          const slug = slugFromLink(link);
          if (slug === null) {
            return refuse(NOT_A_TRIP_LINK);
          }

          const { route, policy } = budgetFor(search, kind);
          const over = await overBudget(ctx, route, policy, SEARCHING);
          if (over !== null) {
            return over;
          }
          const provider = placesProvider();
          if (provider === null) {
            return refuse(NO_PLACE_SEARCH);
          }

          const trip = await prismaTripRepository.findBySlug(slug);
          if (trip === null) {
            return refuse(NO_SUCH_TRIP);
          }
          const index = day - 1;
          const plan = trip.days[index];
          if (plan === undefined) {
            return refuse(noSuchDay(day, trip.days.length));
          }

          // A typed search looks first where the day already goes, as the
          // search field does, and then in the day's city.
          if (search !== undefined) {
            const found = await searchPlaces(
              {
                query: search,
                near: searchBias(trip.days, index),
                limit: SEARCHED,
                session: null,
                only: null,
              },
              provider,
            );
            if (found.length === 0) {
              return answer("Nothing matched. Try the name of the place, or the street it is on.");
            }
            const city = plan.city === null ? "" : ` in ${plan.city.name}`;
            return answer(
              [
                `Places that match "${search}", for Day ${String(day)}${city}:`,
                ...placeLines(found, trip.days),
              ].join("\n"),
            );
          }

          // The city's own list is about the city, never the suburb the
          // day's stops happen to be in, so it is asked at the city.
          if (plan.city === null) {
            return refuse(
              `Day ${String(day)} is not in any city, so there is nowhere to look. Give a search instead.`,
            );
          }
          const words = cityListWords(kind ?? null, plan.city.name);
          const found = await recommendPlaces(
            kind ?? null,
            plan.city.position,
            MOST_RECOMMENDED,
            provider,
          );
          if (found.length === 0) {
            return answer(
              words.empty ?? `Nothing turned up in ${plan.city.name}. Give a search instead.`,
            );
          }
          return answer(
            [`${words.heading}, for Day ${String(day)}:`, ...placeLines(found, trip.days)].join("\n"),
          );
        },
      ),
  );
}
