import { describe, expect, it } from "vitest";
import type { LatLng } from "@/core/model/place";
import type { PlaceDetails } from "@/core/ports/places-provider";
import type { TimeZoneProvider } from "@/core/ports/time-zone-provider";
import { UNTITLED } from "./create-trip";
import { lookUpNewTrip } from "./look-up-new-trip";

function city(id: string, name: string, lng: number, timeZone: string | null): PlaceDetails {
  return {
    id,
    providerPlaceId: id,
    name,
    address: null,
    position: { lat: -34.9, lng },
    openingHours: null,
    timeZone,
  };
}

const ADELAIDE = city("adelaide", "Adelaide", 138.6, "Australia/Adelaide");
const BAROSSA = city("barossa", "Barossa Valley", 138.95, null);

/** The provider's details for the cities it knows, with every question kept. */
function places(known: readonly PlaceDetails[]) {
  const asked: string[] = [];
  return {
    asked,
    details: (id: string): Promise<PlaceDetails | null> => {
      asked.push(id);
      return Promise.resolve(known.find((candidate) => candidate.id === id) ?? null);
    },
  };
}

/** A time zone service with one answer for everywhere, with every question kept. */
function timeZones(answer: string | null): TimeZoneProvider & { readonly asked: LatLng[] } {
  const asked: LatLng[] = [];
  return {
    name: "fixed",
    asked,
    lookup: (point) => {
      asked.push(point);
      return Promise.resolve(answer);
    },
  };
}

describe("lookUpNewTrip", () => {
  it("looks each city up once, keeping the stops in order with their days", async () => {
    const provider = places([ADELAIDE, BAROSSA]);
    const zones = timeZones("Australia/Darwin");

    const trip = await lookUpNewTrip(
      {
        stops: [
          { cityPlaceId: "adelaide", days: 2 },
          { cityPlaceId: "barossa", days: 1 },
          { cityPlaceId: "adelaide", days: 1 },
        ],
        startDate: "2026-10-24",
      },
      provider,
      zones,
      "UTC",
    );

    expect(provider.asked).toEqual(["adelaide", "barossa"]);
    expect(trip).toEqual({
      title: UNTITLED,
      timeZone: "Australia/Adelaide",
      startDate: "2026-10-24",
      stops: [
        { city: { providerPlaceId: "adelaide", name: "Adelaide", position: ADELAIDE.position }, days: 2 },
        {
          city: { providerPlaceId: "barossa", name: "Barossa Valley", position: BAROSSA.position },
          days: 1,
        },
        { city: { providerPlaceId: "adelaide", name: "Adelaide", position: ADELAIDE.position }, days: 1 },
      ],
    });
    // The first city named its own clock, so the slower service was never asked.
    expect(zones.asked).toEqual([]);
  });

  it("asks the time zone service when the first city does not say, then falls back", async () => {
    const input = { stops: [{ cityPlaceId: "barossa", days: 3 }], startDate: "2026-10-24" };

    const answered = await lookUpNewTrip(
      input,
      places([BAROSSA]),
      timeZones("Australia/Adelaide"),
      "UTC",
    );
    expect(answered?.timeZone).toBe("Australia/Adelaide");

    const unanswered = await lookUpNewTrip(input, places([BAROSSA]), timeZones(null), "UTC");
    expect(unanswered?.timeZone).toBe("UTC");
  });

  it("asks the time zone service when the first city names a zone nobody keeps", async () => {
    const zones = timeZones("Australia/Adelaide");

    const trip = await lookUpNewTrip(
      { stops: [{ cityPlaceId: "nowhere", days: 1 }], startDate: "2026-10-24" },
      places([city("nowhere", "Nowhere", 139, "Mars/Olympus_Mons")]),
      zones,
      "UTC",
    );

    expect(trip?.timeZone).toBe("Australia/Adelaide");
    expect(zones.asked).toHaveLength(1);
  });

  it("opens nothing when a city cannot be found", async () => {
    const trip = await lookUpNewTrip(
      {
        stops: [
          { cityPlaceId: "adelaide", days: 2 },
          { cityPlaceId: "atlantis", days: 1 },
        ],
        startDate: "2026-10-24",
      },
      places([ADELAIDE]),
      timeZones("Australia/Adelaide"),
      "UTC",
    );

    expect(trip).toBeNull();
  });
});
