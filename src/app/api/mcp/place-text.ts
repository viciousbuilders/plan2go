import type { DayPlan } from "@/core/model/day";
import type { PlaceSuggestion } from "@/core/ports/places-provider";
import { placesOnTheTrip } from "@/features/place-search/places-on-the-trip";

/** "Day 2", "Days 1 and 3", "Days 1, 2 and 4". */
function onDays(numbers: readonly number[]): string {
  const words = numbers.map((number) => String(number));
  const last = words.pop() ?? "";
  return words.length === 0 ? `Day ${last}` : `Days ${words.join(", ")} and ${last}`;
}

/**
 * Places a search found, one to a line: the name, the line the provider
 * writes under it, which for a place is its address and for a city its
 * country, and the provider's identifier for it.
 *
 * A place the trip already holds says which days it is on, where a day starts
 * or ends included, as the planner's own list leaves it out or ticks it, so it
 * is not offered as somewhere new. With no days given, nothing is.
 */
export function placeLines(
  found: readonly PlaceSuggestion[],
  days: readonly DayPlan[],
): readonly string[] {
  const held = days.map((day) => placesOnTheTrip([day]));
  return found.map((place, index) => {
    const on = held.flatMap((ids, at) => (ids.has(place.providerPlaceId) ? [at + 1] : []));
    return [
      `${String(index + 1)}. ${place.name}`,
      place.address,
      `place id ${place.providerPlaceId}`,
      on.length === 0 ? null : `already on ${onDays(on)}`,
    ]
      .filter((part) => part !== null)
      .join(" · ");
  });
}
