import type { McpServer } from "@modelcontextprotocol/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createGooglePlacesProvider } from "@/adapters/places/google-places";
import { createGoogleTimeZoneProvider } from "@/adapters/time-zone/google-time-zone";
import { MAX_STOP_DAYS, MAX_STOPS, MAX_TRIP_DAYS } from "@/core/model/trip";
import type { PlacesProvider } from "@/core/ports/places-provider";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { EDIT_KEY_PATTERN, hashEditKey } from "@/server/ownership/edit-key";
import { googleMapsApiKey } from "@/server/places/google-key";
import { placeDetailsFor, PREVIEW_POLICY, PREVIEW_ROUTE } from "@/server/places/place-details";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { legWrites } from "@/server/travel/leg-cache";
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
  editLinkParts,
  NO_SUCH_TRIP,
  noSuchDay,
  NOT_A_TRIP_LINK,
  READ_ONLY_LINK,
  slugFromLink,
} from "./trip-link";
import { dayText, tripText } from "./trip-text";

/**
 * Said for a key that is not the trip's and for a trip that is not there
 * alike: telling the two apart would turn this into a way to test slugs.
 */
const NOT_YOURS =
  "That editing link does not open a trip for changes. Check the whole link was passed, key and all.";

/**
 * The places provider, reading a place from our own table before paying for
 * it, as the front page and the planner's own add do.
 */
function readingOurTableFirst(google: PlacesProvider): PlacesProvider {
  return { ...google, details: (id, session) => placeDetailsFor(id, google, session) };
}

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
        link: z
          .string()
          .min(1)
          .max(500)
          .describe("The trip's editing link, /t/<slug>/edit/<key>. The read only link cannot change it."),
        day: z
          .number()
          .int()
          .min(1)
          .max(MAX_TRIP_DAYS)
          .describe("Which day of the trip, counting the first as 1."),
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
        "Could not add the place, and the trip is as it was. Check the place id came from find_places, and try again in a moment.",
        async () => {
          const edit = editLinkParts(link);
          if (edit === null) {
            return refuse(slugFromLink(link) === null ? NOT_A_TRIP_LINK : READ_ONLY_LINK);
          }
          // A key shaped wrong is turned away before anything is counted or read.
          if (!EDIT_KEY_PATTERN.test(edit.key)) {
            return refuse(NOT_YOURS);
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

          const trip = await prismaTripRepository.findBySlug(edit.slug);
          if (trip === null) {
            return refuse(NOT_YOURS);
          }
          const plan = trip.days[day - 1];
          if (plan === undefined) {
            return refuse(noSuchDay(day, trip.days.length));
          }

          // The key is checked again before anything is paid for, and once
          // more by the write itself, which is what authorises the change.
          const added = await addStopFromSearch(
            {
              slug: edit.slug,
              editKeyHash: hashEditKey(edit.key),
              dayId: plan.id,
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
          revalidatePath(`/t/${edit.slug}`, "layout");

          // The day as it now stands, timed as its page will time it.
          const changed = await prismaTripRepository.findBySlug(edit.slug);
          const now = changed?.days.find((candidate) => candidate.id === plan.id);
          if (changed === null || now === undefined) {
            return answer(`Added ${added.placeName} to Day ${String(day)}.`);
          }
          const writes = legWrites();
          const [timed] = await computeTrip(
            { ...changed, days: [now] },
            await travelProviderFor([now], writes),
          );
          await writes.landed();
          const heading = `Added ${added.placeName} to Day ${String(day)}. All times are local time in ${changed.timeZone}.`;
          return answer(timed === undefined ? heading : [heading, dayText(timed, day)].join("\n\n"));
        },
      ),
  );
}
