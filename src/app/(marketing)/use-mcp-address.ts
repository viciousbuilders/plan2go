import { useSyncExternalStore } from "react";

/**
 * The live site, the address the root layout gives as metadataBase. The page
 * is built once and served as it is, so this is the address it arrives with,
 * until the browser says where it is really being read.
 */
const LIVE_ORIGIN = "https://plan2go.vietbrosinaus.com";

/** Where every deployment serves its MCP server, the route in src/app/api/mcp. */
const MCP_PATH = "/api/mcp";

/** Where the page is being read from never changes while it is open, so nothing is listened for. */
function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * The MCP address of whichever deployment the page is being read from: the
 * live site, a preview or a dev server, each of which serves one of its own,
 * so the address an assistant is given is the one in front of the reader.
 */
export function useMcpAddress(): string {
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => LIVE_ORIGIN,
  );
  return `${origin}${MCP_PATH}`;
}

/**
 * The app named in the address as `?client=`, which the steps for
 * connecting open on, or null. Only the page's own address is read, so like
 * the origin it is known in the browser alone, and the built page has none.
 */
export function useClientInAddress(): string | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => new URLSearchParams(window.location.search).get("client"),
    () => null,
  );
}
