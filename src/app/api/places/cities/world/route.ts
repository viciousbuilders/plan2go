import { NextResponse } from "next/server";
import { z } from "zod";
import { CITIES_TO_VISIT_POLICY, CITIES_TO_VISIT_ROUTE } from "@/server/places/cities-to-visit";
import { worldCities } from "@/server/places/world-cities";
import { placesRead } from "../../places-read";

/**
 * Cities known the world over, which the front page's field offers before
 * anything is typed in it. The same list for everybody and a read about
 * nobody, so there is nothing here to guard beyond the spend.
 *
 * Counted with the cities worth going to from a city, which the city picker
 * inside a trip offers before anything is typed in it, so the lists offered
 * to an empty field share one budget.
 */
export const GET = placesRead({
  route: CITIES_TO_VISIT_ROUTE,
  policy: CITIES_TO_VISIT_POLICY,
  asking: { many: "searches", again: "try again", service: "place search service" },
  query: z.object({}),
  failing: "World cities failed",
  answer: async (_query, provider) =>
    NextResponse.json({ suggestions: await worldCities(provider) }),
});
