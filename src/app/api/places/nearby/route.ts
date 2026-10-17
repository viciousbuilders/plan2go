import { NextResponse } from "next/server";
import { z } from "zod";
import { PLACE_KINDS } from "@/core/model/place-kind";
import {
  KIND_POLICY,
  KIND_ROUTE,
  MOST_RECOMMENDED,
  POPULAR_POLICY,
  POPULAR_ROUTE,
  recommendPlaces,
} from "@/server/places/recommend-places";
import { placesRead } from "../places-read";

const ASKING = { many: "searches", again: "try again", service: "place search service" };

const popularSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(MOST_RECOMMENDED).default(6),
});

const kindSchema = popularSchema.extend({
  /** One of the fixed kinds and nothing typed, so every answer is one worth keeping. */
  kind: z.enum(PLACE_KINDS),
  limit: z.coerce.number().int().min(1).max(MOST_RECOMMENDED).default(10),
});

const popular = placesRead({
  route: POPULAR_ROUTE,
  policy: POPULAR_POLICY,
  asking: ASKING,
  query: popularSchema,
  failing: "Nearby places failed",
  answer: async ({ lat, lng, limit }, provider) =>
    NextResponse.json({
      suggestions: await recommendPlaces(null, { lat, lng }, limit, provider),
    }),
});

const ofKind = placesRead({
  route: KIND_ROUTE,
  policy: KIND_POLICY,
  asking: ASKING,
  query: kindSchema,
  failing: "Places of a kind failed",
  answer: async ({ kind, lat, lng, limit }, provider) =>
    NextResponse.json({
      suggestions: await recommendPlaces(kind, { lat, lng }, limit, provider),
    }),
});

/**
 * The best known places in the city a trip is in, of one kind or of any. A
 * read, and the coordinates are the trip's own centre rather than anything
 * the reader chose, so there is nothing here worth guarding beyond the spend.
 *
 * One route, counted as two. What the city is known for and the best known of
 * a kind are asked at different rates, so each is held to what a person
 * asking for it reaches: the looser count for the kinds does not loosen the
 * city's list, and pressing through every kind does not use up the list the
 * field opens on. Which one a request is decides its count before anything
 * else is read, and a kind that is not one of ours is refused unanswered.
 */
export function GET(request: Request): Promise<NextResponse> {
  return new URL(request.url).searchParams.has("kind") ? ofKind(request) : popular(request);
}
