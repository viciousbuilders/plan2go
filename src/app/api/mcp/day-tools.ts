import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createGooglePlacesProvider } from "@/adapters/places/google-places";
import { TRAVEL_MODES } from "@/core/model/leg";
import { endpointName } from "@/features/day-planner/endpoint-name";
import { MODE_WORDS } from "@/features/day-planner/leg-marks";
import { googleMapsApiKey } from "@/server/places/google-key";
import { PREVIEW_POLICY, PREVIEW_ROUTE } from "@/server/places/place-details";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { setDayEndpoint } from "@/server/trips/set-day-endpoint";
import { setLegMode } from "@/server/trips/set-leg-mode";
import { travelProviderFor } from "@/app/t/[slug]/travel";
import { guarded, NO_PLACE_SEARCH, overBudget, refuse } from "./tool-call";
import {
  afterChange,
  dayInput,
  editingDay,
  editLinkFrom,
  editLinkInput,
  NOT_YOURS,
  readingOurTableFirst,
  stopOn,
} from "./trip-edit";

/**
 * The tools that change a day itself rather than one stop on it: how a leg of
 * it is travelled, and where it starts and ends. Each goes through the server
 * function the planner's own action calls, with the hash of the key out of
 * the editing link, and gives back the day as the change has left it.
 */
export function registerDayTools(server: McpServer): void {
  server.registerTool(
    "set_travel_mode",
    {
      title: "Change how a leg is travelled",
      description:
        'Change the way one leg of a day is travelled, as choosing another way under a leg in the planner does: drive, transit for public transport, or walk. A leg is named by the stop it arrives at, or by "end" for the leg out to where the day ends. Needs the trip\'s editing link. Returns the day as it now stands, with its new times and every conflict.',
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        to: z
          .union([z.number().int().min(1).max(200), z.literal("end")])
          .describe(
            'The stop the leg arrives at, by its number on the day as get_trip lists it, or "end" for the leg out to where the day ends.',
          ),
        mode: z
          .enum(TRAVEL_MODES)
          .describe("drive, transit for public transport, or walk."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link, day, to, mode }) =>
      guarded(
        "MCP set_travel_mode failed",
        "Could not change how the leg is travelled. Read the day with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const { plan } = editing;

          // The leg's mode is kept on the stop it arrives at, and on the day
          // for the leg out to where the day ends, which is what null names.
          let stopId: string | null = null;
          let toName: string;
          if (to === "end") {
            if (plan.end === null) {
              return refuse(
                `Day ${String(day)} does not end anywhere, so there is no leg out to an end. Set where it ends with set_day_endpoint first.`,
              );
            }
            toName = endpointName(plan.end);
          } else {
            const target = stopOn(plan, day, to);
            if ("refusal" in target) {
              return target.refusal;
            }
            if (to === 1 && plan.start === null) {
              return refuse(
                `Day ${String(day)} begins at Stop 1, so nothing travels to it. Set where the day starts with set_day_endpoint first.`,
              );
            }
            stopId = target.id;
            toName = target.place.name;
          }

          const set = await setLegMode(
            { slug: edit.slug, editKeyHash: edit.editKeyHash, dayId: plan.id, stopId, mode },
            prismaTripRepository,
          );
          if (set.status === "refused") {
            return refuse(NOT_YOURS);
          }
          return afterChange(
            edit.slug,
            plan.id,
            day,
            `The way to ${toName} on Day ${String(day)} is now ${MODE_WORDS[mode]}.`,
          );
        },
      ),
  );

  server.registerTool(
    "set_day_endpoint",
    {
      title: "Set where a day starts or ends",
      description:
        "Set where a day starts or where it ends, such as a hotel, a station or an airport, as the planner's start and end points do, or take one off with null. A point is passed through and takes none of the day's time. Setting where a day ends also makes it where the next day starts, when the next day starts nowhere yet. The legs to and from the point are given the quickest way. Needs the trip's editing link. Returns the day as it now stands, with its new times and every conflict.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        which: z.enum(["start", "end"]).describe("Which end of the day: start or end."),
        place: z
          .string()
          .trim()
          .min(1)
          .max(300)
          .nullable()
          .describe(
            "The place's place id, from find_places, or null to take that end off, so the day starts at its first stop or ends at its last.",
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ link, day, which, place }, ctx) =>
      guarded(
        "MCP set_day_endpoint failed",
        "Could not change where the day starts or ends. Check the place id came from find_places, and read the day with get_trip before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          // A place may have to be looked up, which is counted with the
          // planner's look at a place, where the same details are paid for.
          // Taking an end off looks nothing up.
          if (place !== null) {
            const over = await overBudget(ctx, PREVIEW_ROUTE, PREVIEW_POLICY, {
              many: "places looked up",
              again: "set it again",
            });
            if (over !== null) {
              return over;
            }
          }
          const apiKey = googleMapsApiKey();
          if (apiKey === null) {
            return refuse(NO_PLACE_SEARCH);
          }
          // The key is compared here, before the place is paid for, and again
          // by the write, which is what authorises the change.
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const { plan, trip } = editing;

          const set = await setDayEndpoint(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              dayId: plan.id,
              which,
              providerPlaceId: place,
              label: null,
              session: null,
            },
            prismaTripRepository,
            readingOurTableFirst(createGooglePlacesProvider({ apiKey })),
            travelProviderFor,
          );
          if (set.status === "refused") {
            return refuse(NOT_YOURS);
          }
          if (set.status === "no-such-place") {
            return refuse(
              "That place could not be found. Find it again with find_places and pass the place id it gives.",
            );
          }

          const named = `Day ${String(day)}`;
          const said =
            set.placeName === null
              ? which === "start"
                ? `${named} no longer starts anywhere set, so it begins at its first stop.`
                : `${named} no longer ends anywhere set, so it ends at its last stop.`
              : `${named} now ${which === "start" ? "starts" : "ends"} at ${set.placeName}.`;

          // The planner offers where a day ends to the next day as its start,
          // when that day starts nowhere yet. Said when it took the offer.
          const nextStartedNowhere = trip.days[day]?.start === null;
          return afterChange(edit.slug, plan.id, day, said, (now) =>
            which === "end" && nextStartedNowhere && (now.days[day]?.start ?? null) !== null
              ? `Day ${String(day + 1)} started nowhere, so it now starts there too.`
              : null,
          );
        },
      ),
  );
}
