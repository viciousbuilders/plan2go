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
import { lookUpNewTrip } from "@/server/trips/look-up-new-trip";
import { newTripInputSchema } from "@/server/trips/new-trip-input";
import { openTrip } from "@/server/trips/open-trip";
import { openingTimeZone } from "@/server/trips/time-zones";

export interface CreateTripFormState {
  readonly error: string | null;
  /** Which field the sentence is about, when it is about one. */
  readonly field: "city" | null;
}

/**
 * Opening a trip from the form on the front page.
 *
 * It goes through openTrip rather than straight to storage, so every way a
 * trip is opened shares one rate limit and none is a way around the others.
 */
export async function createTripAction(
  _previous: CreateTripFormState,
  formData: FormData,
): Promise<CreateTripFormState> {
  const parsed = newTripInputSchema.safeParse({
    cityPlaceId: formData.get("cityPlaceId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first === undefined ? "Check the form and send it again." : first.message,
      field: first?.path[0] === "cityPlaceId" ? "city" : null,
    };
  }

  const apiKey = googleMapsApiKey();
  if (apiKey === null) {
    return { error: "Place search is not switched on for this server.", field: null };
  }

  // The one stop the form's city and dates are read as, named here so the
  // type says there is one.
  const [stop] = parsed.data.stops;
  if (stop === undefined) {
    return { error: "The city is missing. Choose where you are going.", field: "city" };
  }
  const asked = await headers();
  const places = createGooglePlacesProvider({ apiKey });

  // Where the request came from is the clock of last resort, when neither the
  // city's details nor the time zone service can say which it keeps.
  const opened = await openTrip(asked, prismaTripRepository, () =>
    lookUpNewTrip(
      parsed.data,
      { details: (id, session) => placeDetailsFor(id, places, session) },
      createGoogleTimeZoneProvider({ apiKey }),
      openingTimeZone(asked),
    ),
  );

  if (opened.status === "too-many") {
    return {
      error: `Too many new trips have been started from this connection. Wait ${String(opened.retryAfterSeconds)} seconds and try again.`,
      field: null,
    };
  }
  if (opened.status === "nowhere") {
    return { error: "That city could not be found. Choose it from the list again.", field: "city" };
  }

  // The cities worth going to from the trip's city, worked out once the
  // traveller is on their way to the trip rather than when they first open
  // the city picker and wait for it.
  after(() => prepareCitiesToVisit(asked, stop.cityPlaceId, places));

  // Straight to the edit link: this is the one moment the key exists in the
  // clear, and the trip is unreachable for editing without it.
  redirect(`/t/${opened.slug}/edit/${opened.editKey}`);
}
