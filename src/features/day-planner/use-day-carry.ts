import type { MouseEvent, PointerEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { DaySlot } from "./day-carry";
import { HOLD_MS, carriedBy, slotAlong } from "./day-carry";
import { CARRY_SLOP, edgeScroll } from "./touch-carry";

/**
 * A press on a day in the strip, from the moment it goes down. Kept in a ref
 * rather than in state, since it changes with every movement of the pointer
 * and nothing is drawn from it directly; what is drawn is in state.
 */
interface Press {
  readonly pointer: number;
  readonly index: number;
  /** A finger, which holds the day before it lifts, so a swipe still scrolls the strip. */
  readonly finger: boolean;
  /** Where the press went down, in the window. */
  readonly fromX: number;
  readonly fromY: number;
  /** Whether the day has lifted and is being carried, rather than only pressed. */
  lifted: boolean;
  /** Where the pointer is now, in the window. */
  x: number;
  /** The day it is over, its own until it reaches another. */
  over: number;
  /** Where the strip's left edge is in the window, measured as the day lifts. */
  origin: number;
  /** Where the press went down along the strip's content. */
  fromAlong: number;
  /** Where every day is along the strip's content, measured as the day lifts. */
  slots: readonly DaySlot[];
  /** The wait a finger's press makes before the day lifts. */
  hold: number;
  /** The frame that runs the strip on under a pointer held near either end of it. */
  frame: number;
  /** Listens for Escape from the moment the day lifts, which puts it back. */
  readonly putBack: (event: KeyboardEvent) => void;
}

/** What the strip draws of a day being carried. */
export interface Lifted {
  /** The day carried, by its place in the trip. */
  readonly index: number;
  /** How far along the strip it is drawn from its own place. */
  readonly by: number;
  /** The day it is over, which it changes places with when let go, or null over its own place. */
  readonly over: number | null;
}

interface DayCarryOptions {
  /** The strip's list of days. What scrolls is the strip it stands in. */
  readonly list: RefObject<HTMLDivElement | null>;
  /** Every day in the strip, in trip order. */
  readonly tabs: RefObject<(HTMLButtonElement | null)[]>;
  /** Lets a day go on another, which swaps the two. Null for a reader, who moves nothing. */
  readonly onSwap: ((from: number, to: number) => void) | null;
  /** Whether a day can be picked up now. */
  readonly ready: boolean;
}

/** What a day in the strip answers a pointer with, while days can be moved. */
type PressHandlers = Partial<{
  readonly onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerCancel: () => void;
  readonly onLostPointerCapture: () => void;
  readonly onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}>;

export interface DayCarry {
  readonly lifted: Lifted | null;
  readonly handlers: (index: number) => PressHandlers;
  /**
   * Whether a click ends a press that carried a day, which chose no day. A
   * click from the keyboard comes with no press, and always chooses.
   */
  readonly carriedClick: (event: MouseEvent<HTMLButtonElement>) => boolean;
}

/**
 * A day carried along the strip onto another, which swaps the two.
 *
 * Done with the pointer's own events rather than the browser's drag, for a
 * finger and a mouse alike. A phone has no drag of its own; a day is a button,
 * which one browser will not drag; and the cards below take whatever the
 * browser's drag brings over them as a stop being dropped. With a mouse the
 * day lifts once it has been dragged a few pixels, so a click still chooses
 * it. A finger has to hold it first, since a finger moving at once is
 * scrolling the strip, and the strip scrolls.
 *
 * The carried day goes where the pointer takes it along the strip, and the
 * day under the pointer is the one it swaps with. Held near either end of the
 * strip, the strip scrolls on under it, so a day can be carried to one that
 * cannot be seen yet. Let go over its own place, cut off, or put down with
 * Escape, it goes back and nothing moves.
 */
export function useDayCarry({ list, tabs, onSwap, ready }: DayCarryOptions): DayCarry {
  const press = useRef<Press | null>(null);
  /** Whether the latest press carried a day, so the click that ends it chooses none. */
  const carried = useRef(false);
  const [lifted, setLifted] = useState<Lifted | null>(null);

  const stripOf = (): HTMLElement | null => list.current?.parentElement ?? null;

  /** The day drawn where the pointer has taken it, and the day under the pointer. */
  const follow = (held: Press): void => {
    const strip = stripOf();
    if (strip === null) {
      return;
    }
    const along = held.x - held.origin + strip.scrollLeft;
    held.over = slotAlong(along, held.slots, held.over);
    setLifted({
      index: held.index,
      by: carriedBy(along - held.fromAlong, held.index, held.slots),
      over: held.over === held.index ? null : held.over,
    });
  };

  /** Every frame of a carry: the strip runs on under a pointer held near either end. */
  const runOn = (): void => {
    const held = press.current;
    const strip = stripOf();
    if (held === null || !held.lifted || strip === null) {
      return;
    }
    const edges = strip.getBoundingClientRect();
    const before = strip.scrollLeft;
    strip.scrollLeft += edgeScroll(held.x, edges.left, edges.right);
    // A strip already at its end does not move, and neither does anything drawn from it.
    if (strip.scrollLeft !== before) {
      follow(held);
    }
    held.frame = requestAnimationFrame(runOn);
  };

  /** The day lifts: every day is measured where it is, and from here it goes with the pointer. */
  const lift = (held: Press): void => {
    const strip = stripOf();
    if (strip === null) {
      return;
    }
    const edges = strip.getBoundingClientRect();
    const scrolled = strip.scrollLeft;
    held.lifted = true;
    held.origin = edges.left;
    held.fromAlong = held.fromX - edges.left + scrolled;
    held.slots = tabs.current.flatMap((tab, index) => {
      if (tab === null) {
        return [];
      }
      const box = tab.getBoundingClientRect();
      return [{ index, start: box.left - edges.left + scrolled, end: box.right - edges.left + scrolled }];
    });
    carried.current = true;
    follow(held);
    held.frame = requestAnimationFrame(runOn);
    window.addEventListener("keydown", held.putBack);
  };

  /** The press over: no more waiting on it, running the strip on with it, or listening for Escape. */
  const release = (held: Press): void => {
    clearTimeout(held.hold);
    cancelAnimationFrame(held.frame);
    window.removeEventListener("keydown", held.putBack);
  };

  /** Let go: over another day the two change places; anywhere else, or cut off, it goes back. */
  const letGo = (drop: boolean): void => {
    const held = press.current;
    if (held === null) {
      return;
    }
    press.current = null;
    release(held);
    if (!held.lifted) {
      return;
    }
    setLifted(null);
    if (drop && held.over !== held.index && onSwap !== null) {
      onSwap(held.index, held.over);
    }
  };

  const pressDown = (event: PointerEvent<HTMLButtonElement>, index: number): void => {
    carried.current = false;
    if (onSwap === null || !ready || press.current !== null || event.button !== 0) {
      return;
    }
    const finger = event.pointerType !== "mouse";
    // A finger's pointer stays with the day it went down on of its own
    // accord. A mouse's is asked to, so a quick drag that leaves the day
    // before it has lifted is still this day's.
    if (!finger) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const held: Press = {
      pointer: event.pointerId,
      index,
      finger,
      fromX: event.clientX,
      fromY: event.clientY,
      lifted: false,
      x: event.clientX,
      over: index,
      origin: 0,
      fromAlong: 0,
      slots: [],
      hold: 0,
      frame: 0,
      putBack: (key) => {
        if (key.key === "Escape") {
          letGo(false);
        }
      },
    };
    if (finger) {
      held.hold = window.setTimeout(() => {
        if (press.current === held) {
          lift(held);
        }
      }, HOLD_MS);
    }
    press.current = held;
  };

  const pressMove = (event: PointerEvent<HTMLButtonElement>): void => {
    const held = press.current;
    if (held === null || event.pointerId !== held.pointer) {
      return;
    }
    held.x = event.clientX;
    if (held.lifted) {
      follow(held);
      return;
    }
    const gone = Math.max(Math.abs(event.clientX - held.fromX), Math.abs(event.clientY - held.fromY));
    if (gone < CARRY_SLOP) {
      return;
    }
    // A finger that moves before the day lifts is scrolling the strip.
    if (held.finger) {
      letGo(false);
      return;
    }
    lift(held);
  };

  /**
   * A finger carrying a day is not scrolling the strip, nor the page under
   * it. Said in a listener of its own, because React listens to a moving
   * finger passively, and a passive listener cannot stop the scroll.
   */
  const movable = onSwap !== null;
  useEffect(() => {
    const node = list.current;
    if (!movable || node === null) {
      return;
    }
    const keepStill = (event: TouchEvent): void => {
      if (press.current?.lifted === true) {
        event.preventDefault();
      }
    };
    node.addEventListener("touchmove", keepStill, { passive: false });
    return () => {
      node.removeEventListener("touchmove", keepStill);
    };
  }, [movable, list]);

  /** A strip that goes while a day is pressed lets go of the press, as letting go does. */
  useEffect(
    () => () => {
      const held = press.current;
      if (held !== null) {
        clearTimeout(held.hold);
        cancelAnimationFrame(held.frame);
        window.removeEventListener("keydown", held.putBack);
      }
    },
    [],
  );

  return {
    lifted,
    handlers: (index) =>
      onSwap === null
        ? {}
        : {
            onPointerDown: (event) => {
              pressDown(event, index);
            },
            onPointerMove: pressMove,
            onPointerUp: (event) => {
              if (press.current?.pointer === event.pointerId) {
                letGo(true);
              }
            },
            onPointerCancel: () => {
              letGo(false);
            },
            onLostPointerCapture: () => {
              letGo(false);
            },
            // A finger held on a day is picking it up, not asking for the
            // phone's menu.
            onContextMenu: (event) => {
              if (press.current?.finger === true) {
                event.preventDefault();
              }
            },
          },
    carriedClick: (event) => event.detail !== 0 && carried.current,
  };
}
