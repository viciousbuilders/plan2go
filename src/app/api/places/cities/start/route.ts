import { NextResponse } from "next/server";
import { z } from "zod";
import { citiesToStart } from "@/server/places/cities-to-start";
import { CITIES_TO_VISIT_POLICY, CITIES_TO_VISIT_ROUTE } from "@/server/places/cities-to-visit";
import { placesRead } from "../../places-read";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

/**
 * The cities worth starting a trip in, for the front door's ticket before a
 * city is on it: the best known in the country the request came from, or
 * the world's. A read about nobody, since the country is the platform's
 * guess from the address and is not kept, so there is nothing here to guard
 * beyond the spend.
 *
 * Counted with the cities worth going to from a city, which the ticket asks
 * for as soon as a city is on it, so there is one budget for the lists the
 * ticket offers however many cities it is given.
 */
export const GET = placesRead({
  route: CITIES_TO_VISIT_ROUTE,
  policy: CITIES_TO_VISIT_POLICY,
  asking: { many: "searches", again: "try again", service: "place search service" },
  query: querySchema,
  failing: "Cities to start in failed",
  answer: async ({ limit }, provider, headers) =>
    NextResponse.json(await citiesToStart(headers, limit, provider)),
});
