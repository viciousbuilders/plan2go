import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { formatDuration } from "@/core/time/minutes";
import { MAX_STAY_MINUTES, moveStop, removeStop, setStopStay } from "@/server/trips/edit-stop";
import { travelProviderFor } from "@/app/t/[slug]/travel";
import { guarded, refuse } from "./tool-call";
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
            editing.plan.id,
            day,
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
            editing.plan.id,
            day,
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
            editing.plan.id,
            day,
            `The time at ${target.place.name} on Day ${String(day)} is now ${formatDuration(minutes)}.`,
          );
        },
      ),
  );
}
