import { cardUnder } from "./touch-carry";

/**
 * A day carried along the strip onto another, to swap the two, by a pointer
 * or a finger.
 *
 * This is the arithmetic of it: which day the pointer is over, and how far the
 * carried day can go. Where each day is is measured once, when it lifts, along
 * the strip's content rather than the window, so a measure taken before the
 * strip scrolls still holds after it.
 */

/** Where one day sits along the strip, from its start to its end. */
export interface DaySlot {
  readonly index: number;
  readonly start: number;
  readonly end: number;
}

/**
 * How long a finger holds a day before it lifts. A finger that moves first is
 * scrolling the strip, and the strip scrolls; one that stays this long has
 * picked the day up. About as long as a phone's own press and hold, so it is
 * a wait the phone has already taught.
 */
export const HOLD_MS = 450;

/**
 * The day a pointer this far along the strip is over, by the rule a card
 * carried down the day keeps: between two days it stays on the one it was
 * over last, before the first day it is the first, and past the last it is
 * the last, so a day can be carried to either end without landing exactly on
 * the end one.
 */
export function slotAlong(along: number, slots: readonly DaySlot[], last: number): number {
  return cardUnder(
    along,
    slots.map(({ index, start, end }) => ({ index, top: start, bottom: end })),
    last,
  );
}

/** Where the strip is in the window. */
export interface StripBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * Whether a pointer is over the strip, which is the only place a carried day
 * can be let go on another. On a desk the day goes wherever the pointer takes
 * it, down over the day or across the map, and let go anywhere but the strip
 * it goes back to its place: only a day in the strip takes it.
 */
export function overTheStrip(x: number, y: number, strip: StripBox): boolean {
  return x >= strip.left && x <= strip.right && y >= strip.top && y <= strip.bottom;
}

/**
 * How far the carried day is drawn from its own place: as far as the pointer
 * has gone, but no further than the first day's start or the last day's end,
 * so it stays over the row of days rather than going off past them.
 */
export function carriedBy(by: number, index: number, slots: readonly DaySlot[]): number {
  const own = slots.find((slot) => slot.index === index);
  const first = slots[0];
  const last = slots[slots.length - 1];
  if (own === undefined || first === undefined || last === undefined) {
    return by;
  }
  return Math.max(first.start - own.start, Math.min(last.end - own.end, by));
}
