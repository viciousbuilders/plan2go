/**
 * A trip's path in a link: `/t/` and the slug after it, up to the first
 * character no slug has. Anything round it is left alone, the address in
 * front, an edit key or a printed page behind, a full stop after it in a
 * sentence. A run longer than any slug is not one, rather than cut down to one.
 */
const TRIP_PATH = /(?:^|\/)t\/([A-Za-z0-9_-]{1,80})(?![A-Za-z0-9_-])/;

/** Said when what was passed has no trip link in it. */
export const NOT_A_TRIP_LINK =
  "That is not a link to a plan2go trip. Pass the trip's own link, which has /t/ in it.";

/** Said when the link names no trip, which is also what a deleted trip's link does. */
export const NO_SUCH_TRIP = "That trip could not be found. Check the link and try again.";

/**
 * The slug out of a trip's link, whichever of its links it is: the read only
 * link, `/t/<slug>`, the editing link, `/t/<slug>/edit/<key>`, or the printed
 * page under either, with the address in front or without it. Null when there
 * is no trip link in it at all. A slug that names no trip is for storage to say.
 *
 * The key in an editing link is never taken out. Everything that reads a trip
 * reads it by the slug alone, and a read that asked for the key would have
 * broken the read only link.
 */
export function slugFromLink(link: string): string | null {
  return TRIP_PATH.exec(link.trim())?.[1] ?? null;
}
