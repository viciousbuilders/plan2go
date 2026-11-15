import type { MouseEvent, PointerEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { HOLD_MS, overTheStrip } from "../day-carry";
import { useDayDrop } from "../day-drop";
import {
  CARRY_SLOP,
  dayUnder,
  daySpans,
  edgeScroll,
  scrolledBy,
  scrollerOf,
  scrollOn,
  visibleBand,
} from "../touch-carry";

/**
 * A press on a stop's card on a phone, from the moment it goes down. Kept in a
 * ref rather than in state, since it changes with every movement of the
 * finger and nothing is drawn from it directly; what is drawn is in state.
 */
interface Press {
  readonly pointer: number;
  /** A finger, which holds the card before it lifts, so a swipe still scrolls the day. */
  readonly finger: boolean;
  /** Where the press went down, in the window. */
  readonly fromX: number;
  readonly fromY: number;
  /** What the day scrolls in, null being the window, and how far it had scrolled then. */
  readonly scroller: HTMLElement | null;
  readonly fromScrolled: number;
  /** Whether the card has lifted and is being carried, rather than only pressed. */
  lifted: boolean;
  /** Where the finger is now, in the window. */
  x: number;
  y: number;
  /** The day in the strip the finger is over, by its place in the trip, or null. */
  overDay: number | null;
  /** The wait a finger's press makes before the card lifts. */
  hold: number;
  /** The frame that runs the page and the strip on under a finger held near an edge. */
  frame: number;
  /** Listens for Escape from the moment the card lifts, which puts it back. */
  readonly putBack: (event: KeyboardEvent) => void;
}

/** What a stop's card answers a press with, while it can be carried. */
type HoldHandlers = Partial<{
  readonly onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerCancel: () => void;
  readonly onLostPointerCapture: () => void;
  readonly onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}>;

export interface StopHold {
  /** How far down from its place the card is drawn while it is carried, or null while it is not. */
  readonly lift: number | null;
  /**
   * Whether the finger carrying it is over the strip of days, where the card
   * is drawn over the days it could go to, and their words cross its own.
   */
  readonly overStrip: boolean;
  readonly handlers: HoldHandlers;
  /**
   * Whether a click ends a press that carried the stop, which opens nothing.
   * A click from the keyboard comes with no press, and always opens it.
   */
  readonly carriedClick: (event: MouseEvent<HTMLButtonElement>) => boolean;
}

/** The strip of days, which runs on sideways under a finger held near either end of it. */
function stripOf(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".day-tabs");
}

/**
 * A stop on a phone carried off its day onto another in the strip, as a day
 * in the strip is carried onto another: a finger holds the card first, since
 * a finger moving at once is scrolling the day, and the day scrolls. A mouse,
 * on a window narrow enough to be laid out as a phone, lifts it once it has
 * been dragged a few pixels, so a click still opens the place.
 *
 * Once lifted the card goes up and down with the finger, over the rest of the
 * day and the strip, and every other day in the strip is offered, the one
 * under the finger outlined as where the stop would go. Held near the top or
 * the foot of the window the page runs on under it, so a strip scrolled out
 * of sight comes back, and held near either end of the strip, level with it,
 * the strip runs on, so a day not in sight can be reached. Let go on a day it
 * goes last on that day, as Move to another day in its sheet takes it. Let go
 * anywhere else, cut off, or put down with Escape, it goes back and nothing
 * moves. Its place in its own day is changed in its sheet, not here.
 *
 * The day under the finger, the offer and the move itself are the planner's,
 * through the same calls a card carried on a desk makes, so a stop is moved
 * to another day in one place however it was carried there.
 */
export function useStopHold(
  stopId: string,
  card: RefObject<HTMLButtonElement | null>,
  onCarry: ((stopId: string | null) => void) | null,
): StopHold {
  const dayDrop = useDayDrop();
  const press = useRef<Press | null>(null);
  /** Whether the latest press carried the stop, so the click that ends it opens nothing. */
  const carried = useRef(false);
  const [lift, setLift] = useState<number | null>(null);
  const [overStrip, setOverStrip] = useState(false);

  /** The card drawn as far down as the finger has gone, and the day it is over. */
  const follow = (held: Press): void => {
    setLift(held.y + scrolledBy(held.scroller) - (held.fromY + held.fromScrolled));
    const strip = stripOf();
    setOverStrip(strip !== null && overTheStrip(held.x, held.y, strip.getBoundingClientRect()));
    const day = dayUnder(held.x, held.y, daySpans());
    if (day !== held.overDay) {
      held.overDay = day;
      dayDrop.setOverDay(day);
    }
  };

  /**
   * Every frame of a carry: the page runs on under a finger near its top or
   * foot, and the strip under one near either of its ends, level with it.
   */
  const runOn = (): void => {
    const held = press.current;
    if (held === null || !held.lifted) {
      return;
    }
    let moved = false;
    const band = visibleBand(held.scroller);
    const by = edgeScroll(held.y, band.top, band.bottom);
    if (by !== 0) {
      const before = scrolledBy(held.scroller);
      scrollOn(held.scroller, by);
      moved = scrolledBy(held.scroller) !== before;
    }
    const strip = stripOf();
    if (strip !== null) {
      const edges = strip.getBoundingClientRect();
      if (held.y >= edges.top && held.y <= edges.bottom) {
        const before = strip.scrollLeft;
        strip.scrollLeft += edgeScroll(held.x, edges.left, edges.right);
        moved = moved || strip.scrollLeft !== before;
      }
    }
    // Nothing that has reached its end moves, and nothing drawn from it either.
    if (moved) {
      follow(held);
    }
    held.frame = requestAnimationFrame(runOn);
  };

  /** The card lifts: from here it goes with the finger, and the other days take it. */
  const liftUp = (held: Press): void => {
    if (onCarry === null) {
      return;
    }
    held.lifted = true;
    carried.current = true;
    onCarry(stopId);
    follow(held);
    held.frame = requestAnimationFrame(runOn);
    window.addEventListener("keydown", held.putBack);
  };

  /** Let go: on a day in the strip the stop goes there; anywhere else it goes back. */
  const letGo = (drop: boolean): void => {
    const held = press.current;
    if (held === null) {
      return;
    }
    press.current = null;
    clearTimeout(held.hold);
    cancelAnimationFrame(held.frame);
    window.removeEventListener("keydown", held.putBack);
    if (!held.lifted) {
      return;
    }
    setLift(null);
    setOverStrip(false);
    if (drop && held.overDay !== null) {
      dayDrop.dropOnDay(held.overDay);
    } else {
      onCarry?.(null);
    }
  };

  const pressDown = (event: PointerEvent<HTMLButtonElement>): void => {
    carried.current = false;
    if (onCarry === null || press.current !== null || event.button !== 0) {
      return;
    }
    const finger = event.pointerType !== "mouse";
    // A finger's pointer stays with the card it went down on of its own
    // accord. A mouse's is asked to, so a quick drag that leaves the card
    // before it has lifted is still this card's.
    if (!finger) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const scroller = scrollerOf(event.currentTarget);
    const held: Press = {
      pointer: event.pointerId,
      finger,
      fromX: event.clientX,
      fromY: event.clientY,
      scroller,
      fromScrolled: scrolledBy(scroller),
      lifted: false,
      x: event.clientX,
      y: event.clientY,
      overDay: null,
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
          liftUp(held);
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
    held.y = event.clientY;
    if (held.lifted) {
      follow(held);
      return;
    }
    const gone = Math.max(Math.abs(event.clientX - held.fromX), Math.abs(event.clientY - held.fromY));
    if (gone < CARRY_SLOP) {
      return;
    }
    // A finger that moves before the card lifts is scrolling the day.
    if (held.finger) {
      letGo(false);
      return;
    }
    liftUp(held);
  };

  /**
   * A finger carrying a stop is not scrolling the page under it. Said in a
   * listener of its own on the card, because React listens to a moving finger
   * passively, and a passive listener cannot stop the scroll; on the card
   * rather than the window, so a swipe anywhere else is never held up by it.
   */
  const movable = onCarry !== null;
  useEffect(() => {
    const node = card.current;
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
  }, [movable, card]);

  /** A card that goes while it is pressed lets go of the press, as letting go does. */
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
    lift,
    overStrip,
    handlers:
      onCarry === null
        ? {}
        : {
            onPointerDown: pressDown,
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
            // A finger held on a card is picking it up, not asking for the
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
