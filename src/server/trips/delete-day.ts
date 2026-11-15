import { colorsOf, settleCityColors } from "@/core/model/city-colors";
import type { DayId } from "@/core/model/day";
import type { DayDeleted, TripRepository } from "../repositories/trip-repository";

export interface DeleteDayRequest {
  readonly slug: string;
  /** The hash of the key out of the edit link. No key, no write. */
  readonly editKeyHash: string;
  readonly dayId: DayId;
}

/**
 * Takes a day off its trip, with everything on it. The trip keeps its first
 * date and is a day shorter: every day after the one taken off moves up a
 * place, with everything on it, and so takes the date before the one it had.
 * Day 2 of five taken off, Days 3 to 5 become Days 2 to 4, and the trip ends
 * a day sooner. Nothing on them is changed to suit their new dates; a place
 * closed on the day it lands on is said on that day, as any conflict is.
 *
 * A trip keeps at least one day, so its only day is never taken off. That is
 * decided by storage, after the key, so the answer says nothing about a trip
 * to someone it is not theirs to change.
 *
 * The trip is read first for the colours its cities are shown in, written
 * with the removal: a city the trip no longer reaches gives its colour up, and
 * every other city keeps the one it had, even on a trip whose colours were
 * worked out as it was read and the order it reaches its cities has changed.
 * The read is not the authorisation; that is the key, checked in the write.
 */
export async function deleteDay(
  request: DeleteDayRequest,
  repository: TripRepository,
): Promise<DayDeleted> {
  const trip = await repository.findBySlug(request.slug);
  const days = trip?.days ?? [];
  if (!days.some((day) => day.id === request.dayId)) {
    return { status: "refused" };
  }

  const left = days.filter((day) => day.id !== request.dayId);
  return repository.deleteDay({
    slug: request.slug,
    editKeyHash: request.editKeyHash,
    dayId: request.dayId,
    colors: settleCityColors(
      colorsOf(days),
      left.map((day) => day.city),
    ),
  });
}
