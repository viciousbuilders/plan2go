import type { DayPlan } from "@/core/model/day";
import { formatDistance } from "@/core/model/distance";
import type { PlaceCard } from "@/core/model/place";
import type { PlaceSuggestion } from "@/core/ports/places-provider";
import { placesOnTheTrip } from "@/features/place-search/places-on-the-trip";

/** The sheet's own way of writing a count: "12,345". */
const COUNT = new Intl.NumberFormat("en-AU");

/** "a", "a and b", "a, b and c". */
function listed(parts: readonly string[]): string {
  const last = parts[parts.length - 1] ?? "";
  return parts.length < 2 ? last : `${parts.slice(0, -1).join(", ")} and ${last}`;
}

/** "Day 2", "Days 1 and 3", "Days 1, 2 and 4". */
export function onDays(numbers: readonly number[]): string {
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

/**
 * Cities worth going to, one to a line, as the planner's city picker lists
 * them: the name, how far it is in a straight line from the day's city, and
 * the provider's identifier for it, which set_day_city takes.
 */
export function cityLines(found: readonly PlaceSuggestion[]): readonly string[] {
  return found.map((city, index) =>
    [
      `${String(index + 1)}. ${city.name}`,
      city.distanceMeters === null ? null : `${formatDistance(city.distanceMeters)} away`,
      `place id ${city.providerPlaceId}`,
    ]
      .filter((part) => part !== null)
      .join(" · "),
  );
}

/**
 * Everywhere a place is on the trip, by the numbers the tools take, in the
 * order the trip reaches it: "Stop 3 on Day 1", and "where Day 2 starts" for
 * a day's start or end.
 */
export function placeOnTrip(providerPlaceId: string, days: readonly DayPlan[]): readonly string[] {
  return days.flatMap((day, index) => {
    const number = String(index + 1);
    return [
      day.start?.place.providerPlaceId === providerPlaceId ? `where Day ${number} starts` : null,
      ...day.stops.map((stop, at) =>
        stop.place.providerPlaceId === providerPlaceId
          ? `Stop ${String(at + 1)} on Day ${number}`
          : null,
      ),
      day.end?.place.providerPlaceId === providerPlaceId ? `where Day ${number} ends` : null,
    ].filter((where) => where !== null);
  });
}

/**
 * What a place is like, in the order the planner's place sheet tells it: the
 * name, what kind of place it is with its rating and price, the provider's
 * sentence about it, how to reach it, and what people say, each review on a
 * line of its own. Where it is on the trip comes before the reviews, since it
 * is what the tools name it by. Credited to Google wherever the sheet credits
 * it, which its terms ask for.
 */
export function placeCardText(
  place: { readonly name: string; readonly address: string | null },
  card: PlaceCard,
  onTrip: readonly string[],
): string {
  const facts = [
    card.kind,
    card.rating === null
      ? null
      : `${card.rating.toFixed(1)} out of 5${card.ratingCount === null ? "" : ` from ${COUNT.format(card.ratingCount)} ratings`}`,
    card.priceLevel === null
      ? null
      : card.priceLevel === 0
        ? "Free"
        : `Price level ${String(card.priceLevel)} of 4`,
  ].filter((fact) => fact !== null);

  const about = [
    place.name,
    facts.length === 0 ? null : facts.join(" · "),
    card.summary,
    place.address === null ? null : `Address: ${place.address}`,
    card.website === null ? null : `Website: ${card.website}`,
    card.phone === null ? null : `Phone: ${card.phone}`,
    card.mapsUrl === null ? null : `Google Maps: ${card.mapsUrl}`,
    onTrip.length === 0 ? null : `On the trip: ${listed(onTrip)}.`,
  ].filter((line) => line !== null);

  const said =
    card.reviews.length === 0
      ? ["Google has no reviews for this place."]
      : [
          "What people say:",
          ...card.reviews.map((review) =>
            [
              `- ${review.author}, ${String(review.rating)} out of 5, ${review.when}`,
              review.text === null ? "" : `: ${review.text.replace(/\s*\n\s*/g, " ")}`,
            ].join(""),
          ),
        ];

  const credited = card.reviews.length > 0 || card.rating !== null || card.summary !== null;
  return [
    about.join("\n"),
    said.join("\n"),
    credited ? "Ratings and reviews from Google." : null,
  ]
    .filter((block) => block !== null)
    .join("\n\n");
}
