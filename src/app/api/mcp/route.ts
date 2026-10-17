import { createMcpHandler } from "mcp-handler";
import { consumeRateLimit } from "@/server/rate-limit/ip-rate-limit";
import type { RateLimitPolicy } from "@/server/rate-limit/window";
import { registerEditTools } from "./edit-tools";
import { registerPlaceTools } from "./place-tools";
import { registerTripTool } from "./trip-tool";

/**
 * A model calls tools much faster than a person presses anything, and a client
 * spends a request or two finding out what the tools are before it calls one.
 * One a second is more than a conversation about a trip comes to, and stops a
 * client caught in a loop. The tools that pay Google are also counted against
 * the same budgets as the pages, so this guards our own tables, not the spend.
 */
const POLICY: RateLimitPolicy = { windowSeconds: 60, maxRequests: 60 };

const ROUTE = "mcp";

/** What a client is told about the server when it connects, for the model to read first. */
const INSTRUCTIONS = [
  "plan2go plans a trip of several days: the cities it goes to, the places on each day, and how long it takes to get from one to the next.",
  "A trip has two links. The read only link, /t/<slug>, shows it, and the editing link, /t/<slug>/edit/<key>, changes it.",
  "Whoever holds the editing link can change the trip, so it goes only to whoever is planning, and the read only link to everyone else.",
  "To plan a trip, find each city with find_cities, open the trip with open_trip, look for places on a day with find_places, put them on the day with add_place, and read the days back with get_trip, which gives every time and every conflict.",
].join(" ");

const handler = createMcpHandler(
  (server) => {
    registerTripTool(server);
    registerPlaceTools(server);
    registerEditTools(server);
  },
  {
    serverInfo: { name: "plan2go", version: "0.1.0" },
    instructions: INSTRUCTIONS,
  },
);

/**
 * plan2go for a model: Claude, or any client that speaks the Model Context
 * Protocol, opening trips, putting places on them and reading them back
 * through the same code the pages use. Nothing about a client is kept between
 * requests, so any request can land on any function, and a change is made
 * only with the key out of the trip's editing link, passed as the pages pass it.
 *
 * Counted by address before anything else is read, as every public route is.
 * A refusal is a JSON-RPC error, which is what a client reads, without an id,
 * since the body was not read to find one.
 */
async function serve(request: Request): Promise<Response> {
  const limit = await consumeRateLimit(ROUTE, request.headers, POLICY);
  if (!limit.allowed) {
    const wait = String(limit.retryAfterSeconds);
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: `Too many requests from this connection. Wait ${wait} seconds and try again.`,
        },
      },
      { status: 429, headers: { "Retry-After": wait } },
    );
  }
  return handler(request);
}

export { serve as GET, serve as POST };
