import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { legWrites } from "@/server/travel/leg-cache";
import { tripTravelProvider } from "@/app/t/[slug]/travel";
import { answer, guarded, originOf, refuse } from "./tool-call";
import { NO_SUCH_TRIP, NOT_A_TRIP_LINK, slugFromLink } from "./trip-link";
import { tripText } from "./trip-text";

/**
 * Reading a trip whole, timed the way its page is timed. A read, so it is
 * given by the slug alone, and the key in an editing link is never looked at.
 */
export function registerTripTool(server: McpServer): void {
  server.registerTool(
    "get_trip",
    {
      title: "Read a trip",
      description:
        "Read a plan2go trip from its link. Gives every day in order: when it leaves and from where, each stop with the times it is reached and left, its opening hours that day and any note, the travel between stops by the way chosen and how long the other ways would take, and every conflict, such as a place that closes before you arrive, with the times in it. The times are plan2go's own, worked out from real travel times.",
      inputSchema: z.object({
        link: z
          .string()
          .min(1)
          .max(500)
          .describe(
            "The trip's read only link, /t/<slug>. Its editing link works too, but nothing here needs the key in it.",
          ),
      }),
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
}
