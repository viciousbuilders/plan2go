import type { PlacesProvider } from "@/core/ports/places-provider";
import type { TimeZoneProvider } from "@/core/ports/time-zone-provider";
import type { NewTripRequest, TripStop } from "./create-trip";
import { UNTITLED } from "./create-trip";
import type { NewTripInput } from "./new-trip-input";
import { isSupportedTimeZone } from "./time-zones";

/**
 * The trip someone asked to open, with its cities looked up rather than
 * trusted, so the map opens where each actually is and the clock is the one
 * kept where the trip begins. Each city is asked about once, however many
 * times the trip comes back to it. Nothing here names the trip: a trip is not
 * one city, and the traveller names it themselves in the planner.
 *
 * The clock the trip keeps is its first city's, not the one the person asking
 * is sitting in. The city's details name it, and only when they do not is a
 * second, slower call spent finding out. Where neither can, the zone given is
 * a better answer than refusing to open the trip.
 *
 * Whichever way a trip is opened, this is how what was asked for becomes what
 * is stored, handed to `openTrip` to run once the budget allows the trip, so
 * a request the budget turns away spends nothing with the provider. The
 * details are asked of whatever `places` is given, which in the app reads our
 * own table first. Null when a city could not be found, and then there is no
 * trip.
 */
export async function lookUpNewTrip(
  input: NewTripInput,
  places: Pick<PlacesProvider, "details">,
  timeZones: TimeZoneProvider,
  fallbackZone: string,
): Promise<NewTripRequest | null> {
  const asking = [...new Set(input.stops.map((stop) => stop.cityPlaceId))];
  const answers = await Promise.all(asking.map((id) => places.details(id, null)));
  const found = new Map(asking.map((id, index) => [id, answers[index] ?? null]));

  const resolved: TripStop[] = [];
  for (const stop of input.stops) {
    const city = found.get(stop.cityPlaceId) ?? null;
    if (city === null) {
      return null;
    }
    resolved.push({
      city: {
        providerPlaceId: city.providerPlaceId ?? stop.cityPlaceId,
        name: city.name,
        position: city.position,
      },
      days: stop.days,
    });
  }

  const [first, ...rest] = resolved;
  const firstCity = found.get(input.stops[0]?.cityPlaceId ?? "") ?? null;
  if (first === undefined || firstCity === null) {
    return null;
  }
  const zone =
    firstCity.timeZone !== null && isSupportedTimeZone(firstCity.timeZone)
      ? firstCity.timeZone
      : await timeZones.lookup(firstCity.position);
  return {
    title: UNTITLED,
    timeZone: zone ?? fallbackZone,
    startDate: input.startDate,
    stops: [first, ...rest],
  };
}
