import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { exportRequestQuery, MOST_DAYS } from "@/features/day-planner/export/export-query";
import { DEFAULT_EXPORT } from "@/features/day-planner/export/export-request";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { legWrites } from "@/server/travel/leg-cache";
import { tripTravelProvider } from "@/app/t/[slug]/travel";
import { answer, guarded, originOf, refuse } from "./tool-call";
import { NO_SUCH_TRIP, NOT_A_TRIP_LINK, slugFromLink } from "./trip-link";
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
        "A link to the trip as a PDF, as the planner's export makes it: a cover, then each day with something planned on it, with its map, legs, addresses, opening hours, notes and a ruled page after it. The file is drawn when the link is opened, which can take up to a minute, and shows nothing the read only link does not.",
      inputSchema: z.object({ link: readLinkInput }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ link }, ctx) =>
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

          // The days the export offers, as it opens: those with something on
          // them, as many as one file holds, with everything it can print.
          const printable = trip.days.filter((day) => day.stops.length > 0);
          if (printable.length === 0) {
            return refuse(
              "Nothing is planned on any day yet, so there is nothing to put on paper. Put places on the days with add_place first.",
            );
          }
          const query = exportRequestQuery({
            ...DEFAULT_EXPORT,
            dayIds: printable.slice(0, MOST_DAYS).map((day) => day.id),
          });
          query.set("slug", trip.slug);

          const left = trip.days.length - printable.length;
          return answer(
            [
              `${originOf(ctx) ?? ""}/api/export?${query.toString()}`,
              left === 0
                ? null
                : `${String(left)} ${left === 1 ? "day has" : "days have"} nothing planned and ${left === 1 ? "is" : "are"} left out.`,
              printable.length > MOST_DAYS
                ? `One file holds ${String(MOST_DAYS)} days, so this has the first ${String(MOST_DAYS)} with plans. The rest can be exported from the trip's page.`
                : null,
            ]
              .filter((line) => line !== null)
              .join("\n"),
          );
        },
      ),
  );
}
