import type { CallToolResult } from "@modelcontextprotocol/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DayPlan } from "@/core/model/day";
import type { Stop } from "@/core/model/stop";
import type { Trip } from "@/core/model/trip";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import type { PlacesProvider } from "@/core/ports/places-provider";
import { computeTrip } from "@/features/day-planner/compute-trip";
import { formatStops } from "@/features/day-planner/format-stops";
import { EDIT_KEY_PATTERN, editKeyHashMatches, hashEditKey } from "@/server/ownership/edit-key";
import { placeDetailsFor } from "@/server/places/place-details";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import { legWrites } from "@/server/travel/leg-cache";
import { travelProviderFor } from "@/app/t/[slug]/travel";
import { answer, refuse } from "./tool-call";
import { editLinkParts, noSuchDay, NOT_A_TRIP_LINK, READ_ONLY_LINK, slugFromLink } from "./trip-link";
import { dayText } from "./trip-text";

/**
 * What every tool that changes a trip shares: the editing link read and its key
 * checked, the day and the stop a call names, and the day read back once the
 * change is made.
 */

/** The editing link, as every tool that changes a trip takes it. */
export const editLinkInput = z
  .string()
  .min(1)
  .max(500)
  .describe("The trip's editing link, /t/<slug>/edit/<key>. The read only link cannot change it.");

/** A day of the trip, by its number. */
export const dayInput = z
  .number()
  .int()
  .min(1)
  .max(MAX_TRIP_DAYS)
  .describe("Which day of the trip, counting the first as 1.");

/** A stop, by its number on its day, held to as many as the planner's own move counts to. */
export const stopInput = z
  .number()
  .int()
  .min(1)
  .max(200)
  .describe("The stop's number on the day, as get_trip lists it, counting the first as 1.");

/** Why a tool refused, in place of what it was asked for. */
export interface Refusal {
  readonly refusal: CallToolResult;
}

/**
 * Said for a key that is not the trip's and for a trip that is not there
 * alike: telling the two apart would turn this into a way to test slugs.
 */
export const NOT_YOURS =
  "That editing link does not open a trip for changes. Check the whole link was passed, key and all.";

/** The trip an editing link is for, and the hash of its key, which is all storage compares. */
export interface EditLink {
  readonly slug: string;
  readonly editKeyHash: string;
}

/**
 * The editing link out of what was passed, read without asking storage
 * anything: the read only link is told it cannot change the trip, and a key
 * shaped wrong is turned away as any wrong key is. The key goes no further
 * than here; everything after works from its hash.
 */
export function editLinkFrom(link: string): EditLink | Refusal {
  const parts = editLinkParts(link);
  if (parts === null) {
    return { refusal: refuse(slugFromLink(link) === null ? NOT_A_TRIP_LINK : READ_ONLY_LINK) };
  }
  if (!EDIT_KEY_PATTERN.test(parts.key)) {
    return { refusal: refuse(NOT_YOURS) };
  }
  return { slug: parts.slug, editKeyHash: hashEditKey(parts.key) };
}

/** The trip and the day a change is to, with the key already found to be the trip's. */
export interface EditingDay extends EditLink {
  readonly trip: Trip;
  readonly plan: DayPlan;
}

/**
 * The trip and the day a call names, once the key has been compared with the
 * trip's own: the trip and its key read together, so the check costs no
 * round trip of its own, and before anything is paid for. The write that
 * follows checks the key again, and is still what authorises the change.
 */
export async function editingDay(edit: EditLink, day: number): Promise<EditingDay | Refusal> {
  const [trip, storedHash] = await Promise.all([
    prismaTripRepository.findBySlug(edit.slug),
    prismaTripRepository.findEditKeyHash(edit.slug),
  ]);
  if (trip === null || storedHash === null || !editKeyHashMatches(edit.editKeyHash, storedHash)) {
    return { refusal: refuse(NOT_YOURS) };
  }
  const plan = trip.days[day - 1];
  if (plan === undefined) {
    return { refusal: refuse(noSuchDay(day, trip.days.length)) };
  }
  return { ...edit, trip, plan };
}

/** The stop a call names by its number on the day, counting from 1, as get_trip lists them. */
export function stopOn(plan: DayPlan, day: number, stop: number): Stop | Refusal {
  const found = plan.stops[stop - 1];
  if (found !== undefined) {
    return found;
  }
  const has = plan.stops.length === 0 ? "nothing planned yet" : formatStops(plan.stops.length);
  return { refusal: refuse(`Day ${String(day)} has no Stop ${String(stop)}. It has ${has}.`) };
}

/**
 * The places provider, reading a place from our own table before paying for
 * it, as the front page and the planner's own add do.
 */
export function readingOurTableFirst(google: PlacesProvider): PlacesProvider {
  return { ...google, details: (id, session) => placeDetailsFor(id, google, session) };
}

/**
 * The day as a change has left it, timed as its page will time it, under a
 * sentence saying what changed. The trip's pages are revalidated first, as
 * every change the planner makes revalidates them. `also` may add a line
 * about the rest of the trip as it now stands.
 */
export async function afterChange(
  slug: string,
  dayId: string,
  number: number,
  said: string,
  also: (trip: Trip) => string | null = () => null,
): Promise<CallToolResult> {
  revalidatePath(`/t/${slug}`, "layout");
  const trip = await prismaTripRepository.findBySlug(slug);
  const now = trip?.days.find((candidate) => candidate.id === dayId);
  if (trip === null || now === undefined) {
    return answer(said);
  }
  const writes = legWrites();
  const [timed] = await computeTrip({ ...trip, days: [now] }, await travelProviderFor([now], writes));
  await writes.landed();
  const heading = [said, also(trip), `All times are local time in ${trip.timeZone}.`]
    .filter((line) => line !== null)
    .join(" ");
  return answer(timed === undefined ? heading : [heading, dayText(timed, number)].join("\n\n"));
}
