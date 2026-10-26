/** A week's row on a desk's calendar at its own size. Matches the 36px in its class. */
export const WEEK_ROW = 36;

/** The least a week's row is drawn at to fit a window, which leaves a day 24px to press. */
export const WEEK_ROW_LEAST = 28;

/** Room to keep between the calendar and the edge of the window. Matches the 2rem in its width class. */
export const EDGE_GAP = 16;

/**
 * How tall a desk's calendar draws a week so that it fits the room between
 * its field and the window's foot: its own 36px where it fits at that, less
 * where it does not, and never under 28px, where what still does not fit
 * scrolls inside the calendar instead. `rest` is the height of everything in
 * it but the weeks. It is fitted for `weeks` of them, six, the most a month
 * spans, whatever the months on show, so a day keeps its size as the reader
 * moves through them.
 *
 * Under the field it went on past the foot of a short window, which made the
 * page longer than the window: the page could scroll, and where the system
 * draws scrollbars it was given one, which narrowed it and moved everything
 * on it.
 */
export function weekRowFor(room: number, rest: number, weeks: number): number {
  return Math.max(WEEK_ROW_LEAST, Math.min(WEEK_ROW, Math.floor((room - rest) / weeks)));
}
