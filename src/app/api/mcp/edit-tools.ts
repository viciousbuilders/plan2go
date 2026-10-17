import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createGooglePlacesProvider } from "@/adapters/places/google-places";
import { createGoogleTimeZoneProvider } from "@/adapters/time-zone/google-time-zone";
import { MAX_STOP_DAYS, MAX_STOPS } from "@/core/model/trip";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { googleMapsApiKey } from "@/server/places/google-key";
import { PREVIEW_POLICY, PREVIEW_ROUTE } from "@/server/places/place-details";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { addStopFromSearch } from "@/server/trips/add-stop";
import { calendarDate } from "@/server/trips/calendar-date";
import { lookUpNewTrip } from "@/server/trips/look-up-new-trip";
import { newTripInputSchema } from "@/server/trips/new-trip-input";
import { openTrip } from "@/server/trips/open-trip";
import { openingTimeZone } from "@/server/trips/time-zones";
import { travelProviderFor, tripTravelProvider } from "@/app/t/[slug]/travel";
import {
  answer,
  guarded,
  headersOf,
  NO_PLACE_SEARCH,
  originOf,
  overBudget,
  refuse,
} from "./tool-call";
import {
  afterChange,
  dayInput,
  editingDay,
  editLinkFrom,
  editLinkInput,
  NOT_YOURS,
  readingOurTableFirst,
} from "./trip-edit";
import { NO_SUCH_TRIP } from "./trip-link";
import { tripText } from "./trip-text";

/**
 * The tools that change trips: opening one, and putting a place on a day.
 * Each goes the one way the pages go, through `openTrip` and through the
 * planner's own add, so neither is a way around a limit, a check or the key.
 */
export function registerEditTools(server: McpServer): void {
  server.registerTool(
    "open_trip",
    {
      title: "Open a trip",
      description:
        "Open a new plan2go trip, as the front page does: the cities it goes to in order, how many days in each, and the day it departs. Each city is a place id from find_cities, and the first sets the clock the trip keeps. The days start empty. Returns the trip's two links and its days. Whoever holds the editing link can change the trip, so give it only to whoever is planning, and the read only link to everyone else.",
      inputSchema: z.object({
        stops: z
          .array(
            z.object({
              city: z
                .string()
                .trim()
                .min(1)
                .max(300)
                .describe("The city's place id, from find_cities."),
              days: z
                .number()
                .int()
                .min(1)
                .max(MAX_STOP_DAYS)
                .describe("How many days the trip spends there."),
            }),
          )
          .min(1)
          .max(MAX_STOPS)
          .describe("The cities the trip goes to, in the order it goes. A city can come twice."),
        departs: calendarDate("The day the trip departs is missing. Give it as YYYY-MM-DD.").describe(
          "The day the trip departs, as YYYY-MM-DD.",
        ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ stops, departs }, ctx) =>
      guarded(
        "MCP open_trip failed",
        // The provider refuses a malformed place id outright rather than
        // finding nothing, and that is the likeliest failure when a model is
        // passing the ids, so this says to check them as well as to wait.
        "Could not open the trip. Check each city is a place id from find_cities, and try again in a moment.",
        async () => {
          // Checked by the same schema as the front page's form, so a trip
          // opened here can be nothing that one opened there could not be.
          const parsed = newTripInputSchema.safeParse({
            stops: stops.map(({ city, days }) => ({ cityPlaceId: city, days })),
            startDate: departs,
          });
          if (!parsed.success) {
            return refuse(parsed.error.issues[0]?.message ?? "Check the trip and send it again.");
          }
          const apiKey = googleMapsApiKey();
          if (apiKey === null) {
            return refuse(NO_PLACE_SEARCH);
          }

          // The front page also works out the cities worth going to from the
          // first one, for the planner it is about to land on. Nobody opening
          // a trip here is on their way to it, and the picker asks for itself.
          const headers = headersOf(ctx);
          const opened = await openTrip(headers, prismaTripRepository, () =>
            lookUpNewTrip(
              parsed.data,
              readingOurTableFirst(createGooglePlacesProvider({ apiKey })),
              createGoogleTimeZoneProvider({ apiKey }),
              openingTimeZone(headers),
            ),
          );
          if (opened.status === "too-many") {
            return refuse(
              `Too many new trips have been started from this connection. Wait ${String(opened.retryAfterSeconds)} seconds and try again.`,
            );
          }
          if (opened.status === "nowhere") {
            return refuse(
              "A city on the trip could not be found. Find it again with find_cities and pass the place id it gives.",
            );
          }

          const trip = await prismaTripRepository.findBySlug(opened.slug);
          if (trip === null) {
            return refuse(NO_SUCH_TRIP);
          }
          const days = await computeTrip(trip, await tripTravelProvider(trip));
          const origin = originOf(ctx) ?? "";
          return answer(
            [
              [
                "Opened the trip.",
                `Editing link: ${origin}/t/${opened.slug}/edit/${opened.editKey}`,
                "Whoever holds the editing link can change the trip, so it goes only to whoever is planning it.",
              ].join("\n"),
              tripText(trip, days, `${origin}/t/${trip.slug}`),
            ].join("\n\n"),
          );
        },
      ),
  );

  server.registerTool(
    "add_place",
    {
      title: "Add a place to a day",
      description:
        "Put a place on one day of a plan2go trip, as the planner's own add does: it goes at the end of the day, with an hour there, reached the quickest way. Needs the trip's editing link. Returns the day as it now stands, with its new times and every conflict.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        place: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .describe("The place's place id, from find_places."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ link, day, place }, ctx) =>
      guarded(
        "MCP add_place failed",
        "Could not add the place. Check the place id came from find_places, and read the day with get_trip before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          // Counted with the planner's look at a place before adding it, which
          // is where the planner pays for the same details this add looks up.
          const over = await overBudget(ctx, PREVIEW_ROUTE, PREVIEW_POLICY, {
            many: "places added",
            again: "add it again",
          });
          if (over !== null) {
            return over;
          }
          const apiKey = googleMapsApiKey();
          if (apiKey === null) {
            return refuse(NO_PLACE_SEARCH);
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }

          const added = await addStopFromSearch(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              dayId: editing.plan.id,
              providerPlaceId: place,
              session: null,
            },
            prismaTripRepository,
            readingOurTableFirst(createGooglePlacesProvider({ apiKey })),
            travelProviderFor,
          );
          if (added.status === "refused") {
            return refuse(NOT_YOURS);
          }
          if (added.status === "no-such-place") {
            return refuse(
              "That place could not be found. Find it again with find_places and pass the place id it gives.",
            );
          }
          return afterChange(
            edit.slug,
            editing.plan.id,
            day,
            `Added ${added.placeName} to Day ${String(day)}.`,
          );
        },
      ),
  );
}
