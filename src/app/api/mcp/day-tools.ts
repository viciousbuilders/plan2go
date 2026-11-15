import type { McpServer } from "@modelcontextprotocol/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createGooglePlacesProvider } from "@/adapters/places/google-places";
import type { DayPlan } from "@/core/model/day";
import { DEFAULT_START_AT_MINUTES } from "@/core/model/day";
import { cityRun } from "@/core/model/day-city";
import { TRAVEL_MODES } from "@/core/model/leg";
import { formatDateRange } from "@/core/time/date-range";
import { formatClock, parseClock } from "@/core/time/minutes";
import { canReset, listed, onTheDay } from "@/features/day-planner/day-removal";
import { formatDayLong } from "@/features/day-planner/format-day-date";
import { formatStops } from "@/features/day-planner/format-stops";
import { MODE_WORDS } from "@/features/day-planner/leg-marks";
import { googleMapsApiKey } from "@/server/places/google-key";
import { PREVIEW_POLICY, PREVIEW_ROUTE } from "@/server/places/place-details";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { clearDay } from "@/server/trips/clear-day";
import { deleteDay } from "@/server/trips/delete-day";
import { setDayCity } from "@/server/trips/set-day-city";
import { setDayEndpoint } from "@/server/trips/set-day-endpoint";
import { setDayStart } from "@/server/trips/set-day-start";
import { setLegMode } from "@/server/trips/set-leg-mode";
import { swapDays } from "@/server/trips/swap-days";
import { travelProviderFor } from "@/app/t/[slug]/travel";
import { answer, guarded, NO_PLACE_SEARCH, originOf, overBudget, refuse } from "./tool-call";
import {
  afterChange,
  dayInput,
  editingDay,
  editLinkFrom,
  editLinkInput,
  NOT_YOURS,
  readingOurTableFirst,
  stopOn,
  wholeTripAfter,
} from "./trip-edit";
import { noSuchDay } from "./trip-link";
import { dayRun } from "./trip-text";

/**
 * A day in a few words, for saying where a swap put it: the city it is in,
 * when the trip has one, and how much is planned on it.
 */
function dayGist(plan: DayPlan): string {
  const what = plan.stops.length === 0 ? "nothing planned yet" : formatStops(plan.stops.length);
  return plan.city === null ? `the day with ${what}` : `the day in ${plan.city.name} with ${what}`;
}

/**
 * The tools that change a day itself rather than one stop on it: how a leg of
 * it is travelled, where it starts and ends, the city it is in, when it
 * leaves, and its place in the trip. Each goes through the server function the
 * planner's own action calls, with the hash of the key out of the editing
 * link, and gives back the day as the change has left it.
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
            toName = plan.end.place.name;
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
            [plan.id],
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
        "Set where a day starts or where it ends, such as a hotel, a station or an airport, as the planner's start and end points do, or take one off with null. A point is passed through and takes none of the day's time. Setting where a day ends also makes it where the next day starts, when the next day starts nowhere yet. The legs to and from the point are given the quickest way. Needs the trip's editing link. Returns the day as it now stands, and the next day too when it now starts there, with their new times and every conflict.",
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
          // when that day starts nowhere yet. Said when it took the offer, and
          // that day given back with this one, since its times move with it.
          const next = trip.days[day];
          const offered = which === "end" && set.placeName !== null && next?.start === null;
          return afterChange(edit.slug, offered ? [plan.id, next.id] : [plan.id], said, (now) =>
            offered && (now.days[day]?.start ?? null) !== null
              ? `Day ${String(day + 1)} started nowhere, so it now starts there too.`
              : null,
          );
        },
      ),
  );

  server.registerTool(
    "set_day_city",
    {
      title: "Put a day in another city",
      description:
        "Put a day in another city, as the city at the front of the planner's search does. The days straight after it that were in the same city, with nothing planned yet, go with it, and every stop stays where it is. A day's city is where find_places looks for it. Needs the trip's editing link. Returns each day that moved.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        city: z.string().trim().min(1).max(300).describe("The city's place id, from find_cities."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ link, day, city }, ctx) =>
      guarded(
        "MCP set_day_city failed",
        "Could not move the day to the city. Check the city is a place id from find_cities, and read the trip with get_trip before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          // The city may have to be looked up, which is counted with the
          // planner's look at a place, where the same details are paid for.
          const over = await overBudget(ctx, PREVIEW_ROUTE, PREVIEW_POLICY, {
            many: "places looked up",
            again: "set it again",
          });
          if (over !== null) {
            return over;
          }
          const apiKey = googleMapsApiKey();
          if (apiKey === null) {
            return refuse(NO_PLACE_SEARCH);
          }
          // The key is compared here, before the city is paid for, and again
          // by the write, which is what authorises the change.
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const { plan, trip } = editing;
          const moving = cityRun(trip.days, plan.id);

          // The planner also works out the cities worth going to from the
          // new one, for its picker to open on. Nobody here is about to open
          // it, and the picker asks for itself.
          const set = await setDayCity(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              dayId: plan.id,
              providerPlaceId: city,
            },
            prismaTripRepository,
            createGooglePlacesProvider({ apiKey }),
          );
          if (set.status === "refused") {
            return refuse(NOT_YOURS);
          }
          if (set.status === "no-such-city") {
            return refuse(
              "That city could not be found. Find it again with find_cities and pass the place id it gives.",
            );
          }

          const followers = set.days - 1;
          const was = plan.city === null ? "" : ` in ${plan.city.name}`;
          const said = [
            `Day ${String(day)} is now in ${set.city.name}.`,
            followers === 0
              ? null
              : `${dayRun(day + 1, day + followers)} went with it, as ${followers === 1 ? "it" : "they"} came straight after it${was} with nothing planned yet.`,
          ]
            .filter((line) => line !== null)
            .join(" ");
          return afterChange(edit.slug, moving, said);
        },
      ),
  );

  server.registerTool(
    "clear_day",
    {
      title: "Reset a day",
      description:
        "Start a day over, as Reset this day at the foot of a day in the planner does: every stop on it comes off, with its time there and its note, its start and end points come off, and it leaves at 09:00 again. It stays in its city and keeps its number and date, and no other day changes. This cannot be undone and the planner asks first, so ask whoever is planning before calling this, naming the day and what is on it. Needs the trip's editing link. Returns the day as it now stands.",
      inputSchema: z.object({ link: editLinkInput, day: dayInput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link, day }) =>
      guarded(
        "MCP clear_day failed",
        "Could not reset the day. Read the trip with get_trip to see where it stands before trying again.",
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
          const named = `Day ${String(day)}`;
          if (!canReset(plan)) {
            return answer(
              `${named} has nothing to reset: no stops, no start or end point, and it leaves at ${formatClock(DEFAULT_START_AT_MINUTES)} already.`,
            );
          }

          const cleared = await clearDay(
            { slug: edit.slug, editKeyHash: edit.editKeyHash, dayId: plan.id },
            prismaTripRepository,
          );
          if (cleared.status === "refused") {
            return refuse(NOT_YOURS);
          }

          const things = onTheDay(plan);
          const said = [
            `Reset ${named}.`,
            things.length === 0 ? null : `Took off ${listed(things)}.`,
            plan.startAtMinutes === DEFAULT_START_AT_MINUTES
              ? null
              : `It leaves at ${formatClock(DEFAULT_START_AT_MINUTES)} again.`,
            plan.city === null ? null : `It stays in ${plan.city.name}.`,
          ]
            .filter((line) => line !== null)
            .join(" ");
          return afterChange(edit.slug, [plan.id], said);
        },
      ),
  );

  server.registerTool(
    "delete_day",
    {
      title: "Delete a day",
      description:
        "Take a day off the trip with everything on it, as Delete this day at the foot of a day in the planner does. The trip keeps its first date and is a day shorter: every day after it moves up a day, onto the date before, with everything on it, so their numbers and dates change, and the trip ends a day sooner. A trip keeps at least one day, so its only day cannot be deleted; reset it with clear_day instead. This cannot be undone and the planner asks first, so ask whoever is planning before calling this, naming the day, its date and what is on it. Needs the trip's editing link. Returns the whole trip as it now stands, since opening hours and timetables go by the date.",
      inputSchema: z.object({ link: editLinkInput, day: dayInput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ link, day }, ctx) =>
      guarded(
        "MCP delete_day failed",
        "Could not delete the day. Read the trip with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const { plan, trip } = editing;
          const named = `Day ${String(day)}`;
          const onlyDay = `${named} is the trip's only day, and a trip keeps at least one, so it cannot be deleted. Reset it with clear_day to start it over, or delete the whole trip with delete_trip.`;
          if (trip.days.length <= 1) {
            return refuse(onlyDay);
          }

          const deleted = await deleteDay(
            { slug: edit.slug, editKeyHash: edit.editKeyHash, dayId: plan.id },
            prismaTripRepository,
          );
          if (deleted.status === "only-day") {
            return refuse(onlyDay);
          }
          if (deleted.status === "refused") {
            return refuse(NOT_YOURS);
          }
          revalidatePath(`/t/${edit.slug}`, "layout");

          const had = trip.days.length;
          const things = onTheDay(plan);
          const first = trip.days[0];
          const newLast = trip.days[had - 2];
          const said = [
            `Deleted ${named}, ${formatDayLong(plan.date)}${things.length === 0 ? "" : `, with ${listed(things)}`}.`,
            day === had
              ? null
              : `${dayRun(day + 1, had)} moved a day earlier, and ${had - day === 1 ? "is" : "are"} now ${dayRun(day, had - 1)}.`,
            first === undefined || newLast === undefined
              ? null
              : `The trip now runs ${formatDateRange(first.date, newLast.date)}, ${String(had - 1)} ${had - 1 === 1 ? "day" : "days"}.`,
          ]
            .filter((line) => line !== null)
            .join(" ");
          return wholeTripAfter(edit.slug, said, originOf(ctx));
        },
      ),
  );

  server.registerTool(
    "swap_days",
    {
      title: "Swap two days",
      description:
        "Swap two days of the trip, as dragging one day onto another in the planner's strip of days does. Each day keeps everything on it: its stops with the time at each and their notes, how each leg is travelled, where it starts and ends, when it leaves, and its city. It takes the other day's number and date, and the days between them do not move. Nothing on either day is changed to suit its new date, so a place closed on the day it lands on shows as a conflict. Needs the trip's editing link. Returns both days as they now stand, with their new times and every conflict.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        with_day: dayInput.describe("The day it changes places with, counting the first as 1."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ link, day, with_day }) =>
      guarded(
        "MCP swap_days failed",
        "Could not swap the days. Read the trip with get_trip to see where it stands before trying again.",
        async () => {
          if (day === with_day) {
            return refuse(
              `Day ${String(day)} was named twice, so there is nothing to swap. Name two different days.`,
            );
          }
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const other = editing.trip.days[with_day - 1];
          if (other === undefined) {
            return refuse(noSuchDay(with_day, editing.trip.days.length));
          }

          const swapped = await swapDays(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              dayId: editing.plan.id,
              withDayId: other.id,
            },
            prismaTripRepository,
          );
          if (swapped.status === "refused") {
            return refuse(NOT_YOURS);
          }
          return afterChange(
            edit.slug,
            [editing.plan.id, other.id],
            `Day ${String(day)} and Day ${String(with_day)} have changed places, each with everything on it. Day ${String(day)} is now ${dayGist(other)}, and Day ${String(with_day)} ${dayGist(editing.plan)}.`,
          );
        },
      ),
  );

  server.registerTool(
    "set_leaving_time",
    {
      title: "Set when a day leaves",
      description:
        "Set the time a day sets out, as the leaving time on a day in the planner does: when it leaves where it starts, or when it reaches its first stop if it starts nowhere. Every other time on the day follows from this one. Needs the trip's editing link. Returns the day as it now stands, with its new times and every conflict.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        time: z
          .string()
          .max(20)
          .describe("When the day sets out, on the 24-hour clock as HH:MM, such as 08:30."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link, day, time }) =>
      guarded(
        "MCP set_leaving_time failed",
        "Could not change when the day leaves. Read the day with get_trip to see where it stands before trying again.",
        async () => {
          const minutes = parseClock(time);
          if (minutes === null) {
            return refuse(
              "That is not a time on the 24-hour clock. Give it as HH:MM, such as 08:30.",
            );
          }
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }

          const set = await setDayStart(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              dayId: editing.plan.id,
              startAtMinutes: minutes,
            },
            prismaTripRepository,
          );
          if (set.status === "refused") {
            return refuse(NOT_YOURS);
          }
          return afterChange(
            edit.slug,
            [editing.plan.id],
            `Day ${String(day)} now leaves at ${formatClock(minutes)}.`,
          );
        },
      ),
  );
}
