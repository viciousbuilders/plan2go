import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { exportRequestQuery, MOST_DAYS } from "@/features/day-planner/export/export-query";
import { DEFAULT_EXPORT } from "@/features/day-planner/export/export-request";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { legWrites } from "@/server/travel/leg-cache";
import { tripTravelProvider } from "@/app/t/[slug]/travel";
import { onDays } from "./place-text";
import { answer, guarded, originOf, refuse } from "./tool-call";
import { NO_SUCH_TRIP, noSuchDay, NOT_A_TRIP_LINK, slugFromLink } from "./trip-link";
import { tripText } from "./trip-text";

/** Either of a trip's links, as the tools that only read it take them. */
const readLinkInput = z
  .string()
  .min(1)
  .max(500)
  .describe(
    "The trip's read only link, /t/<slug>. Its editing link works too, but nothing here needs the key in it.",
  );

/**
 * Reading a trip whole: timed the way its page is timed, or as the PDF its
 * export prints. Reads, so they are given by the slug alone, and the key in an
 * editing link is never looked at.
 */
export function registerTripTools(server: McpServer): void {
  server.registerTool(
    "get_trip",
    {
      title: "Read a trip",
      description:
        "Read a plan2go trip from its link. Gives every day in order: when it leaves and from where, each stop with the times it is reached and left, its opening hours that day and any note, the travel between stops by the way chosen and how long the other ways would take, and every conflict, such as a place that closes before you arrive, with the times in it. The times are plan2go's own, worked out from real travel times.",
      inputSchema: z.object({ link: readLinkInput }),
      annotations: { readOnlyHint: true },
    },
    async ({ link }, ctx) =>
      guarded(
        "MCP get_trip failed",
        "Could not read the trip. Nothing on it has changed, try again in a moment.",
        async () => {
          const slug = slugFromLink(link);
          if (slug === null) {
            return refuse(NOT_A_TRIP_LINK);
          }
          const trip = await prismaTripRepository.findBySlug(slug);
          if (trip === null) {
            return refuse(NO_SUCH_TRIP);
          }

          // As the page does: every new answer is handed back as it arrives,
          // its write started and waited on once at the end, so the next
          // reader of the trip, here or on the page, finds it kept.
          const writes = legWrites();
          const days = await computeTrip(trip, await tripTravelProvider(trip, writes));
          await writes.landed();

          return answer(tripText(trip, days, `${originOf(ctx) ?? ""}/t/${trip.slug}`));
        },
      ),
  );

  server.registerTool(
    "get_pdf",
    {
      title: "Get the trip as a PDF",
      description:
        "A link to the trip as a PDF, as the planner's export makes it. Unless told otherwise it has everything the export window starts with: a cover, then each day with something planned on it, with its map, travel between stops, addresses, opening hours, notes, a summary under its name and a ruled page after it, on A4 the right way up. Each of those can be left out, and the paper, layout, text and ink chosen, as in the export window. The file is drawn when the link is opened, which can take up to a minute, and shows nothing the read only link does not.",
      inputSchema: z.object({
        link: readLinkInput,
        days: z
          .array(z.number().int().min(1).max(MAX_TRIP_DAYS))
          .max(MAX_TRIP_DAYS)
          .optional()
          .describe(
            "Which days to put on paper, by number. Leave out for every day with something planned, or give none for the cover alone. A day with nothing planned has no sheet and is left out.",
          ),
        cover: z
          .boolean()
          .optional()
          .describe("A cover page in front: the trip's name, its dates and every day at a glance."),
        route_map: z.boolean().optional().describe("A route map of each day."),
        map_size: z
          .enum(["small", "medium", "large"])
          .optional()
          .describe("How much of the page the route map takes."),
        stop_notes: z.boolean().optional().describe("The note on each stop."),
        travel: z
          .boolean()
          .optional()
          .describe(
            "How each stop is reached from the one before: the way, how long, how far, and what to catch.",
          ),
        addresses: z.boolean().optional().describe("The street address under each place."),
        opening_hours: z.boolean().optional().describe("When each place is open that day."),
        notes_pages: z.boolean().optional().describe("A ruled page after each day, for writing on."),
        day_summary: z
          .boolean()
          .optional()
          .describe(
            "A strip under each day's name: when it leaves, when it is over, how many stops and how long is spent travelling.",
          ),
        paper: z.enum(["a4", "a5"]).optional().describe("The paper the pages are made for."),
        layout: z.enum(["portrait", "landscape"]).optional().describe("Which way up the pages are."),
        text_size: z.enum(["small", "medium", "large"]).optional().describe("How big the words are."),
        ink: z
          .enum(["colour", "mono"])
          .optional()
          .describe("colour, or mono for a printer without colour."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ link, days, ...choices }, ctx) =>
      guarded(
        "MCP get_pdf failed",
        "Could not make the link to the PDF. Nothing on the trip has changed, try again in a moment.",
        async () => {
          const slug = slugFromLink(link);
          if (slug === null) {
            return refuse(NOT_A_TRIP_LINK);
          }
          const trip = await prismaTripRepository.findBySlug(slug);
          if (trip === null) {
            return refuse(NO_SUCH_TRIP);
          }

          // The days asked for, in the trip's own order, or as the export
          // opens, every one with something on it. A day with nothing on it
          // cannot be chosen there, since a blank sheet is worse than none.
          const asked =
            days === undefined
              ? trip.days.map((_plan, index) => index + 1)
              : [...new Set(days)].sort((one, other) => one - other);
          const missing = asked.find((number) => trip.days[number - 1] === undefined);
          if (missing !== undefined) {
            return refuse(noSuchDay(missing, trip.days.length));
          }
          const printable = asked.filter(
            (number) => (trip.days[number - 1]?.stops.length ?? 0) > 0,
          );
          const empty = asked.filter((number) => !printable.includes(number));
          const cover = choices.cover ?? DEFAULT_EXPORT.cover;
          if (printable.length === 0) {
            if (days === undefined) {
              return refuse(
                "Nothing is planned on any day yet, so there is nothing to put on paper. Put places on the days with add_place first.",
              );
            }
            if (days.length > 0) {
              return refuse(
                `Nothing is planned on ${onDays(empty)} yet, so there is nothing to put on paper. Ask for days with something planned, or for the cover alone with no days.`,
              );
            }
            if (!cover) {
              return refuse("No days and no cover is no page at all. Ask for a day, or for the cover.");
            }
          }

          const query = exportRequestQuery({
            dayIds: printable
              .slice(0, MOST_DAYS)
              .flatMap((number) => trip.days[number - 1]?.id ?? []),
            cover,
            map: choices.route_map ?? DEFAULT_EXPORT.map,
            mapSize: choices.map_size ?? DEFAULT_EXPORT.mapSize,
            notes: choices.stop_notes ?? DEFAULT_EXPORT.notes,
            legs: choices.travel ?? DEFAULT_EXPORT.legs,
            addresses: choices.addresses ?? DEFAULT_EXPORT.addresses,
            ruled: choices.notes_pages ?? DEFAULT_EXPORT.ruled,
            hours: choices.opening_hours ?? DEFAULT_EXPORT.hours,
            stats: choices.day_summary ?? DEFAULT_EXPORT.stats,
            paper: choices.paper ?? DEFAULT_EXPORT.paper,
            orientation: choices.layout ?? DEFAULT_EXPORT.orientation,
            text: choices.text_size ?? DEFAULT_EXPORT.text,
            ink: choices.ink ?? DEFAULT_EXPORT.ink,
          });
          query.set("slug", trip.slug);

          return answer(
            [
              `${originOf(ctx) ?? ""}/api/export?${query.toString()}`,
              empty.length === 0
                ? null
                : days === undefined
                  ? `${String(empty.length)} ${empty.length === 1 ? "day has" : "days have"} nothing planned and ${empty.length === 1 ? "is" : "are"} left out.`
                  : `Nothing is planned on ${onDays(empty)}, so ${empty.length === 1 ? "it is" : "they are"} left out.`,
              printable.length > MOST_DAYS
                ? `One file holds ${String(MOST_DAYS)} days, so this has the first ${String(MOST_DAYS)} with plans. Ask for the rest by their numbers in another file.`
                : null,
            ]
              .filter((line) => line !== null)
              .join("\n"),
          );
        },
      ),
  );
}
