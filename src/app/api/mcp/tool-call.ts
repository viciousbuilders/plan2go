import type { CallToolResult, ServerContext } from "@modelcontextprotocol/server";
import { consumeRateLimit } from "@/server/rate-limit/ip-rate-limit";
import type { RateLimitPolicy } from "@/server/rate-limit/window";

/** What a tool found, in the words the model reads. */
export function answer(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

/**
 * Why a tool did nothing, which says what happened and then what to do. Marked
 * as an error, so the model takes it as a refusal rather than as an answer to
 * pass on.
 */
export function refuse(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

/**
 * The HTTP request a call came in on. The handler is given it for every call,
 * from clients of either protocol generation. Were it ever missing, the call
 * would be counted with everyone who could not be identified, which is the
 * strict way to fail.
 */
function requestOf(ctx: ServerContext): Request | null {
  return ctx.http?.req ?? null;
}

/** Where the call came in, for a link back to this same deployment. */
export function originOf(ctx: ServerContext): string | null {
  const request = requestOf(ctx);
  return request === null ? null : new URL(request.url).origin;
}

/**
 * The words a refusal over a budget uses for what was being done: "Too many
 * `searches` from this connection. Wait 30 seconds and `search again`."
 */
interface Asking {
  readonly many: string;
  readonly again: string;
}

/**
 * Counts a call against the budget the same question has when the pages ask
 * it, so the tools are no way around the limits a person is held to. Null when
 * the call may go ahead, and otherwise the refusal to give. Called before
 * anything the answer reads, our own tables included, as every places read is.
 */
export async function overBudget(
  ctx: ServerContext,
  route: string,
  policy: RateLimitPolicy,
  asking: Asking,
): Promise<CallToolResult | null> {
  const limit = await consumeRateLimit(route, requestOf(ctx)?.headers ?? new Headers(), policy);
  if (limit.allowed) {
    return null;
  }
  return refuse(
    `Too many ${asking.many} from this connection. Wait ${String(limit.retryAfterSeconds)} seconds and ${asking.again}.`,
  );
}

/**
 * A tool's work, with whatever it throws kept in the function log and turned
 * into a sentence. Left to the SDK, a throw reaches the model as its raw
 * message and is logged nowhere, so the failure would reach nobody who could
 * do anything about it.
 */
export async function guarded(
  failing: string,
  sorry: string,
  work: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await work();
  } catch (cause) {
    console.error(failing, cause);
    return refuse(sorry);
  }
}
