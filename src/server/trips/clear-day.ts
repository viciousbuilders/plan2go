import type { DayId } from "@/core/model/day";
import { DEFAULT_START_AT_MINUTES } from "@/core/model/day";
import type { DayCleared, TripRepository } from "../repositories/trip-repository";

export interface ClearDayRequest {
  readonly slug: string;
  /** The hash of the key out of the edit link. No key, no write. */
  readonly editKeyHash: string;
  readonly dayId: DayId;
}

/**
 * Starts a day over. Every stop on it comes off, with its time there and its
 * note, its start and end points come off, and it leaves again at the hour a
 * new day leaves at. It stays in its city and in its place in the trip, so no
 * other day moves or changes.
 *
 * The key is checked inside the query that finds the day, so a day on a trip
 * that is not yours is refused the same way as a day that is not there.
 */
export function clearDay(
  request: ClearDayRequest,
  repository: TripRepository,
): Promise<DayCleared> {
  return repository.clearDay({
    slug: request.slug,
    editKeyHash: request.editKeyHash,
    dayId: request.dayId,
    startAtMinutes: DEFAULT_START_AT_MINUTES,
  });
}
