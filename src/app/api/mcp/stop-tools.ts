import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { formatDuration } from "@/core/time/minutes";
import {
  MAX_NOTE_LENGTH,
  MAX_STAY_MINUTES,
  moveStop,
  moveStopToDay,
  removeStop,
  setStopNote,
  setStopStay,
} from "@/server/trips/edit-stop";
import { travelProviderFor } from "@/app/t/[slug]/travel";
import { guarded, refuse } from "./tool-call";
import { noSuchDay } from "./trip-link";
import {
  afterChange,
  dayInput,
  editingDay,
  editLinkFrom,
  editLinkInput,
  NOT_YOURS,
  stopInput,
  stopOn,
} from "./trip-edit";

/**
 * The tools that change one stop on a day, named by its number on the day as
 * get_trip lists it. Each makes its change through the server function the
 * planner's own action calls, with the hash of the key out of the editing
 * link, and gives back the day as the change has left it.
 */
export function registerStopTools(server: McpServer): void {
  server.registerTool(
    "remove_stop",
    {
      title: "Remove a stop",
      description:
        "Take a stop off its day, as the planner's own remove does. The stops after it move up, and the leg that now joins the stops either side is given the quickest way. Needs the trip's editing link. Returns the day as it now stands, with its new times and every conflict.",
      inputSchema: z.object({ link: editLinkInput, day: dayInput, stop: stopInput }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ link, day, stop }) =>
      guarded(
        "MCP remove_stop failed",
        "Could not remove the stop. Read the day with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const target = stopOn(editing.plan, day, stop);
          if ("refusal" in target) {
            return target.refusal;
          }

          const removed = await removeStop(
            { slug: edit.slug, editKeyHash: edit.editKeyHash, stopId: target.id },
            prismaTripRepository,
            travelProviderFor,
          );
          if (removed.status === "refused") {
            return refuse(NOT_YOURS);
          }
          return afterChange(
            edit.slug,
            [editing.plan.id],
            `Removed ${target.place.name} from Day ${String(day)}.`,
          );
        },
      ),
  );

  server.registerTool(
    "move_stop",
    {
      title: "Move a stop",
      description:
        "Move a stop up or down its day, as dragging it in the planner does. Every leg the new order gives different ends to is given the quickest way, and a leg that still joins the same two places keeps the way it had. Needs the trip's editing link. Returns the day as it now stands, with its new times and every conflict.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        stop: stopInput,
        to: z
          .number()
          .int()
          .min(1)
          .max(200)
          .describe(
            "Where the stop goes on the day, counting the first as 1. A number past the last stop puts it last.",
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ link, day, stop, to }) =>
      guarded(
        "MCP move_stop failed",
        "Could not move the stop. Read the day with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const target = stopOn(editing.plan, day, stop);
          if ("refusal" in target) {
            return target.refusal;
          }

          const moved = await moveStop(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              stopId: target.id,
              toPosition: to - 1,
            },
            prismaTripRepository,
            travelProviderFor,
          );
          if (moved.status === "refused") {
            return refuse(NOT_YOURS);
          }
          // Where it landed, read back rather than worked out here: storage
          // keeps a move inside the day, so a number past the end is the last.
          return afterChange(
            edit.slug,
            [editing.plan.id],
            `Moved ${target.place.name} on Day ${String(day)}.`,
            (trip) => {
              const at = trip.days
                .find((candidate) => candidate.id === editing.plan.id)
                ?.stops.findIndex((candidate) => candidate.id === target.id);
              return at === undefined || at === -1 ? null : `It is now Stop ${String(at + 1)}.`;
            },
          );
        },
      ),
  );

  server.registerTool(
    "move_stop_to_day",
    {
      title: "Move a stop to another day",
      description:
        "Move a stop from its day to another day of the trip, as dragging its card onto that day in the planner does. It keeps its time there and its note, and goes last on that day unless to says where. The leg that now closes over the gap it leaves, and the legs into and out of it on its new day, are given the quickest way. Needs the trip's editing link. Returns both days as they now stand, with their new times and every conflict.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        stop: stopInput,
        to_day: dayInput.describe("The day it goes to, counting the first as 1."),
        to: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe(
            "Where it goes on that day, counting the first as 1. Leave it out, or give a number past the last stop, to put it last.",
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ link, day, stop, to_day, to }) =>
      guarded(
        "MCP move_stop_to_day failed",
        "Could not move the stop. Read the trip with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const target = stopOn(editing.plan, day, stop);
          if ("refusal" in target) {
            return target.refusal;
          }
          const onto = editing.trip.days[to_day - 1];
          if (onto === undefined) {
            return refuse(noSuchDay(to_day, editing.trip.days.length));
          }
          if (onto.id === editing.plan.id) {
            return refuse(
              `${target.place.name} is on Day ${String(day)} already. Move it within the day with move_stop.`,
            );
          }

          const moved = await moveStopToDay(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              stopId: target.id,
              dayId: onto.id,
              toPosition: to === undefined ? onto.stops.length : to - 1,
            },
            prismaTripRepository,
            travelProviderFor,
          );
          if (moved.status === "refused") {
            return refuse(NOT_YOURS);
          }
          // Where it landed, read back rather than worked out here, as
          // move_stop says it.
          return afterChange(
            edit.slug,
            [editing.plan.id, onto.id],
            `Moved ${target.place.name} from Day ${String(day)} to Day ${String(to_day)}.`,
            (trip) => {
              const at = trip.days
                .find((candidate) => candidate.id === onto.id)
                ?.stops.findIndex((candidate) => candidate.id === target.id);
              return at === undefined || at === -1
                ? null
                : `It is now Stop ${String(at + 1)} there.`;
            },
          );
        },
      ),
  );

  server.registerTool(
    "set_time_at_place",
    {
      title: "Set the time at a place",
      description:
        "Set how long the day spends at a stop, as the planner's time at places does. Every time after it on the day moves with it. Needs the trip's editing link. Returns the day as it now stands, with its new times and every conflict.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        stop: stopInput,
        minutes: z
          .number()
          .int()
          .min(0)
          .max(MAX_STAY_MINUTES)
          .describe("How long to spend there, in whole minutes: 90 is an hour and a half, 0 is passing by."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link, day, stop, minutes }) =>
      guarded(
        "MCP set_time_at_place failed",
        "Could not change the time at the place. Read the day with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const target = stopOn(editing.plan, day, stop);
          if ("refusal" in target) {
            return target.refusal;
          }

          const changed = await setStopStay(
            {
              slug: edit.slug,
              editKeyHash: edit.editKeyHash,
              stopId: target.id,
              stayMinutes: minutes,
            },
            prismaTripRepository,
          );
          if (changed.status === "refused") {
            return refuse(NOT_YOURS);
          }
          return afterChange(
            edit.slug,
            [editing.plan.id],
            `The time at ${target.place.name} on Day ${String(day)} is now ${formatDuration(minutes)}.`,
          );
        },
      ),
  );

  server.registerTool(
    "set_note",
    {
      title: "Write a note on a stop",
      description:
        "Write the note on a stop, as the note under a stop in the planner does: a line for whoever the trip is shared with, such as what to book or what to bring. It takes the place of any note there was, and null takes the note off. It changes no times. Needs the trip's editing link. Returns the day as it now stands.",
      inputSchema: z.object({
        link: editLinkInput,
        day: dayInput,
        stop: stopInput,
        note: z
          .string()
          .max(MAX_NOTE_LENGTH)
          .nullable()
          .describe(
            `The note, up to ${String(MAX_NOTE_LENGTH)} characters, or null to take it off. A note of only spaces takes it off too.`,
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ link, day, stop, note }) =>
      guarded(
        "MCP set_note failed",
        "Could not write the note. Read the day with get_trip to see where it stands before trying again.",
        async () => {
          const edit = editLinkFrom(link);
          if ("refusal" in edit) {
            return edit.refusal;
          }
          const editing = await editingDay(edit, day);
          if ("refusal" in editing) {
            return editing.refusal;
          }
          const target = stopOn(editing.plan, day, stop);
          if ("refusal" in target) {
            return target.refusal;
          }

          const changed = await setStopNote(
            { slug: edit.slug, editKeyHash: edit.editKeyHash, stopId: target.id, note },
            prismaTripRepository,
          );
          if (changed.status === "refused") {
            return refuse(NOT_YOURS);
          }
          // Spaces alone are no note, as the planner's field takes them.
          const at = `${target.place.name} on Day ${String(day)}`;
          return afterChange(
            edit.slug,
            [editing.plan.id],
            note === null || note.trim() === "" ? `${at} has no note now.` : `Wrote the note on ${at}.`,
          );
        },
      ),
  );
}
