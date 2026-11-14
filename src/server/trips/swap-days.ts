import { colorsOf } from "@/core/model/city-colors";
import type { DayId } from "@/core/model/day";
import type { DaysSwapped, TripRepository } from "../repositories/trip-repository";

export interface SwapDaysRequest {
  readonly slug: string;
  /** The hash of the key out of the edit link. No key, no write. */
  readonly editKeyHash: string;
  readonly dayId: DayId;
  readonly withDayId: DayId;
}

/**
 * Two days of a trip change places: Day 2 in Canberra and Day 4 in Sydney
 * become Day 2 in Sydney and Day 4 in Canberra. Each keeps everything on it,
 * its stops with their stays and notes, the ways between them, its two ends,
 * when it leaves and its city, and takes the other's number and date. The
 * days between them do not move.
 *
 * Nothing on either day is changed to suit its new date. A place closed on
 * the day it lands on, or a train that runs at another hour, is said on the
 * day the next time it is read, as any conflict is.
 *
 * The trip is read first for the colours its cities are shown in, written
 * with the swap so that no dot changes. It is not the authorisation: that is
 * the key, checked inside the query that does the writing.
 */
export async function swapDays(
  request: SwapDaysRequest,
  repository: TripRepository,
): Promise<DaysSwapped> {
  const trip = await repository.findBySlug(request.slug);
  const days = trip?.days ?? [];
  const known = (id: DayId): boolean => days.some((day) => day.id === id);
  if (request.dayId === request.withDayId || !known(request.dayId) || !known(request.withDayId)) {
    return { status: "refused" };
  }

  return repository.swapDays({
    slug: request.slug,
    editKeyHash: request.editKeyHash,
    dayId: request.dayId,
    withDayId: request.withDayId,
    colors: colorsOf(days),
  });
}
