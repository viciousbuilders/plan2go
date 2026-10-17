import type { McpServer } from "@modelcontextprotocol/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Trip } from "@/core/model/trip";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import { formatDateRange } from "@/core/time/date-range";
import { daysBetween } from "@/core/time/zoned";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { daysLost } from "@/features/trip-settings/days-lost";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { legWrites } from "@/server/travel/leg-cache";
import { addDay } from "@/server/trips/add-day";
import { calendarDate } from "@/server/trips/calendar-date";
import { deleteTrip } from "@/server/trips/delete-trip";
import type { TripSettings } from "@/server/trips/trip-settings-input";
import { tripSettingsSchema } from "@/server/trips/trip-settings-input";
import { updateTripSettings } from "@/server/trips/update-trip-settings";
import { tripTravelProvider } from "@/app/t/[slug]/travel";
import { answer, guarded, originOf, refuse } from "./tool-call";
import type { Refusal } from "./trip-edit";
import { afterChange, editingTrip, editLinkFrom, editLinkInput, NOT_YOURS } from "./trip-edit";
import { dayRun, tripText } from "./trip-text";

/**
 * The trip's name and dates as the planner's form saves them: checked by the
 * same schema, with whatever is not being changed sent back as it stands,
 * since the form always sends all three.
 */
function settingsFor(
  trip: Trip,
  change: Partial<Pick<TripSettings, "title" | "startDate" | "endDate">>,
): TripSettings | Refusal {
  const parsed = tripSettingsSchema.safeParse({
    slug: trip.slug,
    title: change.title ?? trip.title,
    startDate: change.startDate ?? trip.days[0]?.date,
    endDate: change.endDate ?? trip.days[trip.days.length - 1]?.date,
  });
  if (!parsed.success) {
    return { refusal: refuse(parsed.error.issues[0]?.message ?? "Check the trip and send it again.") };
  }
  return parsed.data;
}

/**
 * The tools that change the trip as a whole rather than a day of it, which
 * the planner keeps at the top of the trip: what it is called, the dates and
 * days it runs to, and deleting it. Each goes through the server function the
 * planner's own action calls, with the hash of the key out of the editing link.
 */
export function registerSettingsTools(server: McpServer): void {
  server.registerTool(
    "rename_trip",
    {
      title: "Name the trip",
      description:
        "Give a plan2go trip its name, as the name at the top of the planner does. A trip is called Untitled trip until it is named, and the name heads its page, its cover in print and its PDF. Needs the trip's editing link.",
      inputSchema: z.object({
        link: editLinkInput,
        name: z
          .string()
          .max(200)
          .describe("What to call the trip, up to 80 characters, such as Hanoi with the kids."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link, name }) =>
      guarded(
        "MCP rename_trip failed",
        "Could not name the trip. Read it with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingTrip(edit);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const settings = settingsFor(editing.trip, { title: name });
          if ("refusal" in settings) {
            return settings.refusal;
          }

          const saved = await updateTripSettings(settings, edit.editKeyHash, prismaTripRepository);
          if (saved.status === "refused") {
            return refuse(NOT_YOURS);
          }
          revalidatePath(`/t/${edit.slug}`, "layout");
          return answer(`The trip is now called "${settings.title}".`);
        },
      ),
  );

  server.registerTool(
    "set_trip_dates",
    {
      title: "Change the trip's dates",
      description:
        "Change a plan2go trip's first and last day, as the planner's dates do. Days keep what is planned on them by their number, not their date: Day 1 is the first day whatever date it falls on, so moving the first day moves every day with it. Dates that come to more days add empty days at the end, in the city the last day is in. Dates that come to fewer take the last days off with whatever is planned on them, which cannot be brought back, so that is refused until remove_planned_days is true. Needs the trip's editing link. Returns the whole trip as it now stands, since opening hours and timetables go by the date.",
      inputSchema: z.object({
        link: editLinkInput,
        first_day: calendarDate("The first day is missing. Give it as YYYY-MM-DD.").describe(
          "The trip's first day, as YYYY-MM-DD.",
        ),
        last_day: calendarDate("The last day is missing. Give it as YYYY-MM-DD.").describe(
          "The trip's last day, as YYYY-MM-DD.",
        ),
        remove_planned_days: z
          .boolean()
          .optional()
          .describe(
            "true to let the new dates take off days that have stops on them. Ask whoever is planning first, since the stops go with the days.",
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link, first_day, last_day, remove_planned_days }, ctx) =>
      guarded(
        "MCP set_trip_dates failed",
        "Could not change the trip's dates. Read the trip with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingTrip(edit);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const { trip } = editing;
          const settings = settingsFor(trip, { startDate: first_day, endDate: last_day });
          if ("refusal" in settings) {
            return settings.refusal;
          }

          // Said before it is saved, as the planner's dates say it, and
          // saved only once whoever is planning has said yes to it.
          const had = trip.days.length;
          const count = daysBetween(settings.startDate, settings.endDate) + 1;
          const stopsByDay = trip.days.map((day) => day.stops.length);
          const stopsLost = stopsByDay.slice(count).reduce((sum, stops) => sum + stops, 0);
          if (stopsLost > 0 && remove_planned_days !== true) {
            return refuse(
              `${daysLost(stopsByDay, count) ?? ""} If whoever is planning wants that, call set_trip_dates again with remove_planned_days set to true.`,
            );
          }

          const saved = await updateTripSettings(settings, edit.editKeyHash, prismaTripRepository);
          if (saved.status === "refused") {
            return refuse(NOT_YOURS);
          }
          revalidatePath(`/t/${edit.slug}`, "layout");

          const said = [
            `The trip now runs ${formatDateRange(settings.startDate, settings.endDate)}, ${String(count)} ${count === 1 ? "day" : "days"}.`,
            count > had
              ? `${dayRun(had + 1, count)} ${count - had === 1 ? "is" : "are"} new, with nothing planned yet.`
              : null,
            count < had
              ? `Took ${dayRun(count + 1, had)} off the trip${
                  stopsLost === 0
                    ? ""
                    : `, with the ${stopsLost === 1 ? "stop" : `${String(stopsLost)} stops`} on ${had - count === 1 ? "it" : "them"}`
                }.`
              : null,
          ]
            .filter((line) => line !== null)
            .join(" ");

          // Every day, since every day may have moved to another date.
          const now = await prismaTripRepository.findBySlug(edit.slug);
          if (now === null) {
            return answer(said);
          }
          const writes = legWrites();
          const days = await computeTrip(now, await tripTravelProvider(now, writes));
          await writes.landed();
          return answer(
            [said, tripText(now, days, `${originOf(ctx) ?? ""}/t/${now.slug}`)].join("\n\n"),
          );
        },
      ),
  );

  server.registerTool(
    "add_day",
    {
      title: "Add a day",
      description:
        "Put one more day on the end of a plan2go trip, as the planner's add a day does. The new day is empty and in the city the last day is in, and nothing already on the trip moves. Needs the trip's editing link. Returns the new day.",
      inputSchema: z.object({ link: editLinkInput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ link }) =>
      guarded(
        "MCP add_day failed",
        "Could not add the day. Read the trip with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }

          const added = await addDay(
            { slug: edit.slug, editKeyHash: edit.editKeyHash },
            prismaTripRepository,
          );
          if (added.status === "too-long") {
            return refuse(
              `A trip runs to ${String(MAX_TRIP_DAYS)} days at most, and this one has that many already.`,
            );
          }
          if (added.status === "refused") {
            return refuse(NOT_YOURS);
          }
          // Storage gives the new day its id, so it is read back to be shown.
          const trip = await prismaTripRepository.findBySlug(edit.slug);
          const last = trip?.days[trip.days.length - 1];
          return afterChange(
            edit.slug,
            last === undefined ? [] : [last.id],
            `Added Day ${String(trip?.days.length ?? 0)} to the end of the trip.`,
          );
        },
      ),
  );

  server.registerTool(
    "delete_trip",
    {
      title: "Delete a trip",
      description:
        "Delete a plan2go trip for good, as the planner's Delete trip does: its days, its stops and both its links go, and nothing can bring them back. The planner asks first, so ask whoever is planning before calling this, naming the trip by its name and dates. Needs the trip's editing link.",
      inputSchema: z.object({ link: editLinkInput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link }) =>
      guarded(
        "MCP delete_trip failed",
        "Could not delete the trip. Read it with get_trip to see whether it is still there before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          // Read for the name and dates it is said to be gone by. The delete
          // checks the key again, and is what authorises it.
          const editing = await editingTrip(edit);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const { trip } = editing;

          const deleted = await deleteTrip(
            { slug: edit.slug, editKeyHash: edit.editKeyHash },
            prismaTripRepository,
          );
          if (deleted.status === "refused") {
            return refuse(NOT_YOURS);
          }
          revalidatePath(`/t/${edit.slug}`, "layout");
          const first = trip.days[0];
          const last = trip.days[trip.days.length - 1];
          const ran =
            first === undefined || last === undefined
              ? ""
              : `, which ran ${formatDateRange(first.date, last.date)}`;
          return answer(
            `Deleted "${trip.title}"${ran}. Its links no longer open it, and it cannot be brought back.`,
          );
        },
      ),
  );
}
