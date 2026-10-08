"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createGooglePlacesProvider } from "@/adapters/places/google-places";
import { createGoogleTimeZoneProvider } from "@/adapters/time-zone/google-time-zone";
import { prepareCitiesToVisit } from "@/server/places/cities-to-visit";
import { googleMapsApiKey } from "@/server/places/google-key";
import { placeDetailsFor } from "@/server/places/place-details";
import { prismaTripRepository } from "@/server/repositories/prisma-trip-repository";
import type { NewTripRequest, TripStop } from "@/server/trips/create-trip";
import { UNTITLED } from "@/server/trips/create-trip";
import { newTripInputSchema } from "@/server/trips/new-trip-input";
import { openTrip } from "@/server/trips/open-trip";
import { isSupportedTimeZone, openingTimeZone } from "@/server/trips/time-zones";

export interface CreateTripFormState {
  readonly error: string | null;
}

/**
 * Opening a trip from the ticket on the front page.
 *
 * It goes through openTrip rather than straight to storage, so every way a
 * trip is opened shares one rate limit and none is a way around the others.
 */
export async function createTripAction(
  _previous: CreateTripFormState,
  formData: FormData,
): Promise<CreateTripFormState> {
  // A stop is two fields side by side, its city and its days, as many of each
  // as there are stops, in the order the trip makes them.
  const days = formData.getAll("stopDays");
  const parsed = newTripInputSchema.safeParse({
    stops: formData.getAll("stopPlaceId").map((cityPlaceId, index) => ({
      cityPlaceId,
      days: days[index],
    })),
    startDate: formData.get("startDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the trip and send it again." };
  }

  const apiKey = googleMapsApiKey();
  if (apiKey === null) {
    return { error: "Place search is not switched on for this server." };
  }

  const { stops, startDate } = parsed.data;
  // At least one, as the schema has it, named here so the type says so too.
  const [opening] = stops;
  if (opening === undefined) {
    return { error: "The trip has no stops yet. Type a city and choose it from the list." };
  }
  const asked = await headers();
  const places = createGooglePlacesProvider({ apiKey });

  // The cities are looked up here rather than trusted from the form, so the
  // map opens where each actually is and the clock is the one kept where the
  // trip begins. Each once, however many times the trip comes back to it. They
  // do not name the trip: a trip is not one city, and the traveller names it
  // themselves in the planner.
  //
  // The clock the trip keeps is its first city's, not the one the browser is
  // sitting in. The details answer names it, and only when it does not is a
  // second, slower call spent finding out. Where neither can, the request's
  // own guess is a better answer than refusing to open the trip.
  const lookedUp = async (): Promise<NewTripRequest | null> => {
    const asking = [...new Set(stops.map((stop) => stop.cityPlaceId))];
    const answers = await Promise.all(asking.map((id) => placeDetailsFor(id, places, null)));
    const found = new Map(asking.map((id, index) => [id, answers[index] ?? null]));

    const resolved: TripStop[] = [];
    for (const stop of stops) {
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
    const firstCity = found.get(opening.cityPlaceId) ?? null;
    if (first === undefined || firstCity === null) {
      return null;
    }
    const zone =
      firstCity.timeZone !== null && isSupportedTimeZone(firstCity.timeZone)
        ? firstCity.timeZone
        : await createGoogleTimeZoneProvider({ apiKey }).lookup(firstCity.position);
    return {
      title: UNTITLED,
      timeZone: zone ?? openingTimeZone(asked),
      startDate,
      stops: [first, ...rest],
    };
  };

  const opened = await openTrip(asked, prismaTripRepository, lookedUp);

  if (opened.status === "too-many") {
    return {
      error: `Too many new trips have been started from this connection. Wait ${String(opened.retryAfterSeconds)} seconds and try again.`,
    };
  }
  if (opened.status === "nowhere") {
    return {
      error: "A city on the trip could not be found. Remove it and choose it from the list again.",
    };
  }

  // The cities worth going to from the trip's own city, worked out once the
  // traveller is on their way to the trip rather than when they first open
  // the city picker and wait for it.
  after(() => prepareCitiesToVisit(asked, opening.cityPlaceId, places));

  // Straight to the edit link: this is the one moment the key exists in the
  // clear, and the trip is unreachable for editing without it.
  redirect(`/t/${opened.slug}/edit/${opened.editKey}`);
}
