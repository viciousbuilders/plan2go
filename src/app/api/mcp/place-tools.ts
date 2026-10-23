import type { McpServer, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createGooglePlacesProvider } from "@/adapters/places/google-places";
import { citiesOf, sameCity } from "@/core/model/day-city";
import type { PlaceKind } from "@/core/model/place-kind";
import { PLACE_KINDS } from "@/core/model/place-kind";
import type { Trip } from "@/core/model/trip";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import type { PlacesProvider } from "@/core/ports/places-provider";
import { cityListWords } from "@/features/place-search/place-kinds";
import { searchBias } from "@/features/place-search/search-bias";
import {
  CITIES_TO_VISIT_POLICY,
  CITIES_TO_VISIT_ROUTE,
  citiesToVisit,
} from "@/server/places/cities-to-visit";
import { googleMapsApiKey } from "@/server/places/google-key";
import { CARD_POLICY, CARD_ROUTE, placeCardFor } from "@/server/places/place-card";
import { PREVIEW_POLICY, PREVIEW_ROUTE, placeDetailsFor } from "@/server/places/place-details";
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
import { cityLines, placeCardText, placeLines, placeOnTrip } from "./place-text";
import { answer, guarded, NO_PLACE_SEARCH, overBudget, refuse } from "./tool-call";
import type { Refusal } from "./trip-edit";
import { editingTrip, editLinkFrom, stopOn } from "./trip-edit";
import {
  editLinkParts,
  NO_SUCH_TRIP,
  noSuchDay,
  NOT_A_TRIP_LINK,
  slugFromLink,
} from "./trip-link";

/**
 * As many as one typed search answers with, and what the planner's search
 * field and the front page ask for, so a search asked here and there is one
 * row in our own table.
 */
const SEARCHED = 5;

const SEARCHING = { many: "searches", again: "search again" };

/**
 * The cities worth going to that are asked for, as many as the planner's
 * picker asks for, since the trip's own come out of them.
 */
const CITIES_OFFERED = 20;

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

/** What get_place is asked about: a place by its id, or a stop or an end of a day by where it is. */
type PlaceAsked =
  | { readonly kind: "id"; readonly place: string }
  | { readonly kind: "stop"; readonly day: number; readonly stop: number | "start" | "end" };

/** A place as get_place tells it: what it is called and where, and the provider's id for it. */
interface NamedPlace {
  readonly providerPlaceId: string | null;
  readonly name: string;
  readonly address: string | null;
}

/**
 * The place get_place was asked about. A stop or an end of a day is read off
 * the trip, and so is a place id the trip has held. Any other place id is a
 * place being looked at before it is added, which the planner shows only to
 * whoever holds the key: it is looked up as the planner's look at a place
 * does, counted against the same budget, and paid for only once the key is
 * found to be the trip's.
 */
async function placeNamed(
  trip: Trip,
  asked: PlaceAsked,
  link: string,
  ctx: ServerContext,
  provider: PlacesProvider,
): Promise<NamedPlace | Refusal> {
  if (asked.kind === "stop") {
    const plan = trip.days[asked.day - 1];
    if (plan === undefined) {
      return { refusal: refuse(noSuchDay(asked.day, trip.days.length)) };
    }
    if (asked.stop === "start" || asked.stop === "end") {
      const end = plan[asked.stop];
      return end === null
        ? {
            refusal: refuse(
              `Day ${String(asked.day)} does not ${asked.stop} anywhere set. Name one of its stops instead.`,
            ),
          }
        : end.place;
    }
    const found = stopOn(plan, asked.day, asked.stop);
    return "refusal" in found ? found : found.place;
  }

  const held = await prismaTripRepository.findPlaceByProviderId(trip.slug, asked.place);
  if (held !== null) {
    return held;
  }
  if (editLinkParts(link) === null) {
    return {
      refusal: refuse(
        "That place is not on this trip, and looking at one before it is added takes the trip's editing link, as adding it would. Pass the editing link, or name a stop on the trip.",
      ),
    };
  }
  const edit = editLinkFrom(link);
  if ("refusal" in edit) {
    return edit;
  }
  const editing = await editingTrip(edit);
  if ("refusal" in editing) {
    return editing;
  }
  const over = await overBudget(ctx, PREVIEW_ROUTE, PREVIEW_POLICY, {
    many: "places looked at",
    again: "look at it again",
  });
  if (over !== null) {
    return { refusal: over };
  }
  const details = await placeDetailsFor(asked.place, provider, null);
  return details === null
    ? {
        refusal: refuse(
          "That place could not be found. Find it again with find_places and pass the place id it gives.",
        ),
      }
    : details;
}

/**
 * Looking for cities and for places, and reading about a place, through the
 * same cached searches and lookups as the front page and the planner, and
 * counted against the same budgets by address. Reads, so none asks for an
 * editing link, but for a place not on the trip yet, which the planner shows
 * only to whoever could add it.
 */
export function registerPlaceTools(server: McpServer): void {
  server.registerTool(
    "find_cities",
    {
      title: "Find a city",
      description:
        "Look up cities by name, with the same search as the city field on the plan2go front page. Each city comes with the country it is in, which tells two cities of the same name apart, and its place id.",
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

  server.registerTool(
    "suggest_cities",
    {
      title: "Cities to go to from a day",
      description:
        "The cities worth going to from the city a day is in, as the planner's city picker lists them before anything is typed: the towns near it and the best known cities in its country, nearest first, each with how far it is in a straight line and its place id. Cities the trip goes to already are left out. Put a day in one with set_day_city.",
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
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ link, day }, ctx) =>
      guarded(
        "MCP suggest_cities failed",
        "Could not reach the place search service. Your trip is saved, try again in a moment.",
        async () => {
          const slug = slugFromLink(link);
          if (slug === null) {
            return refuse(NOT_A_TRIP_LINK);
          }
          const over = await overBudget(ctx, CITIES_TO_VISIT_ROUTE, CITIES_TO_VISIT_POLICY, SEARCHING);
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
          const plan = trip.days[day - 1];
          if (plan === undefined) {
            return refuse(noSuchDay(day, trip.days.length));
          }
          const city = plan.city;
          if (city === null || city.providerPlaceId === null) {
            return refuse(
              `Day ${String(day)} is in no city plan2go can look around. Find a city by name with find_cities instead.`,
            );
          }

          const found = await citiesToVisit(city.providerPlaceId, CITIES_OFFERED, provider);
          if (found === null) {
            return refuse(
              `Could not look around ${city.name}. Find a city by name with find_cities instead.`,
            );
          }
          // As the picker offers them: not the cities the trip goes to,
          // which it shows apart, the day's own among them.
          const going = citiesOf(trip.days);
          const offered = found.filter((one) => !going.some((held) => sameCity(held, one)));
          if (offered.length === 0) {
            return answer(
              `Nothing turned up near ${city.name} that the trip does not go to already. Find a city by name with find_cities.`,
            );
          }
          return answer(
            [
              `Cities worth going to from ${city.name}, for Day ${String(day)}, nearest first:`,
              ...cityLines(offered),
            ].join("\n"),
          );
        },
      ),
  );

  server.registerTool(
    "get_place",
    {
      title: "Read about a place",
      description:
        'What a place is like, as the planner\'s place sheet shows it: what kind of place it is, its rating and price, a line about it, its address, website, phone and Google Maps link, and what people say about it. Name a stop by its day and its number, or "start" or "end" for where a day starts or ends, or give a place id from find_places to look at a place before adding it. A place that is not on the trip needs the trip\'s editing link, as the planner shows those only to whoever can add them.',
      inputSchema: z.object({
        link: z
          .string()
          .min(1)
          .max(500)
          .describe(
            "The trip's read only link, /t/<slug>, or its editing link, which a place not on the trip needs.",
          ),
        place: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .optional()
          .describe("A place id, from find_places. Leave out to name a stop instead."),
        day: z
          .number()
          .int()
          .min(1)
          .max(MAX_TRIP_DAYS)
          .optional()
          .describe("The day the stop is on, counting the first as 1."),
        stop: z
          .union([z.number().int().min(1).max(200), z.enum(["start", "end"])])
          .optional()
          .describe(
            'The stop\'s number on the day, as get_trip lists it, or "start" or "end" for where the day starts or ends.',
          ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ link, place, day, stop }, ctx) =>
      guarded(
        "MCP get_place failed",
        // The provider refuses a malformed place id outright rather than
        // finding nothing, so this says to check the id as well as to wait.
        "Could not look the place up. Check a place id came from find_places, and try again in a moment.",
        async () => {
          const asked: PlaceAsked | null =
            place !== undefined
              ? day === undefined && stop === undefined
                ? { kind: "id", place }
                : null
              : day !== undefined && stop !== undefined
                ? { kind: "stop", day, stop }
                : null;
          if (asked === null) {
            return refuse("Give a place id from find_places, or a day and a stop on it, but not both.");
          }
          const slug = slugFromLink(link);
          if (slug === null) {
            return refuse(NOT_A_TRIP_LINK);
          }

          const over = await overBudget(ctx, CARD_ROUTE, CARD_POLICY, {
            many: "places opened",
            again: "open it again",
          });
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

          const named = await placeNamed(trip, asked, link, ctx, provider);
          if ("refusal" in named) {
            return named.refusal;
          }
          const card =
            named.providerPlaceId === null
              ? null
              : await placeCardFor(named.providerPlaceId, provider);
          if (card === null || named.providerPlaceId === null) {
            return answer(
              [named.name, named.address, "Nothing more is known about this place."]
                .filter((line) => line !== null)
                .join("\n"),
            );
          }
          return answer(
            placeCardText(named, card, placeOnTrip(named.providerPlaceId, trip.days)),
          );
        },
      ),
  );
}
