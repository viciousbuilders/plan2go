import { cardUnder } from "./touch-carry";

/**
 * A day carried onto another in the strip, to swap the two, by a pointer or
 * a finger.
 *
 * This is the arithmetic of it: which day the pointer is over, and whether it
 * is over the strip at all. Where each day is is measured once, when it
 * lifts, along the strip's content rather than the window, so a measure taken
 * before the strip scrolls still holds after it.
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
 * can be let go on another. The day goes wherever the pointer or the finger
 * takes it, down over the day, across the map on a desk, and let go anywhere
 * but the strip it goes back to its place: only a day in the strip takes it.
 */
export function overTheStrip(x: number, y: number, strip: StripBox): boolean {
  return x >= strip.left && x <= strip.right && y >= strip.top && y <= strip.bottom;
}
