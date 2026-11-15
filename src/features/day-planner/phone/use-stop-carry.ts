import type { MouseEvent, PointerEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { HOLD_MS, overTheStrip } from "../day-carry";
import { useDayDrop } from "../day-drop";
import type { CardSpan } from "../touch-carry";
import {
  CARRY_SLOP,
  cardUnder,
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
  /** The stop pressed, by its place in the day. */
  readonly index: number;
  /** A finger, which holds the card before it lifts, so a swipe still scrolls the day. */
  readonly finger: boolean;
  /** Where the press went down, in the window. */
  readonly fromX: number;
  readonly fromY: number;
  /** Whether the card has lifted and is being carried, rather than only pressed. */
  lifted: boolean;
  /** Where the finger is now, in the window. */
  x: number;
  y: number;
  /** Where in the card the finger took it, and how wide it is, measured as it lifts. */
  grabX: number;
  grabY: number;
  width: number;
  /** What the day scrolls in, null being the window, measured as it lifts. */
  scroller: HTMLElement | null;
  /** Where every card is down the content of what scrolls, measured as it lifts. */
  cards: readonly CardSpan[];
  /** The card it is over: its own until it reaches another, and the last one it was over off the day. */
  overCard: number;
  /** Whether the finger is over the strip of days, where no card is under it. */
  overStrip: boolean;
  /** The day in the strip the finger is over, by its place in the trip, or null. */
  overDay: number | null;
  /** The wait a finger's press makes before the card lifts. */
  hold: number;
  /** The frame that runs the page and the strip on under a finger held near an edge. */
  frame: number;
  /** Listens for Escape from the moment the card lifts, which puts it back. */
  readonly putBack: (event: KeyboardEvent) => void;
}

/** What a stop's card answers a press with, while stops can be carried. */
type HoldHandlers = Partial<{
  readonly onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  readonly onPointerCancel: () => void;
  readonly onLostPointerCapture: () => void;
  readonly onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}>;

/** What the day draws of a stop being carried. */
export interface CarriedStop {
  /** The stop carried, by its place in the day. */
  readonly index: number;
  /** Where its picture is drawn, in the window, wherever the finger has taken it. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  /**
   * The card it is over, whose place it takes when let go: null over its own
   * place, and over the strip of days, where a day is what it goes to.
   */
  readonly over: number | null;
  /** Whether the finger is over the strip, where the picture is drawn fainter so the days read. */
  readonly overStrip: boolean;
}

export interface StopCarry {
  readonly carried: CarriedStop | null;
  readonly handlers: (index: number) => HoldHandlers;
  /**
   * Whether a click ends a press that carried a stop, which opens nothing. A
   * click from the keyboard comes with no press, and always opens it.
   */
  readonly carriedClick: (event: MouseEvent<HTMLButtonElement>) => boolean;
}

interface StopCarryOptions {
  /** The phone's day. Its cards are the elements in it marked with their place in the day. */
  readonly day: RefObject<HTMLDivElement | null>;
  /** The stops' ids, in the order the day shows them. */
  readonly stopIds: readonly string[];
  /** Whether a stop can be picked up now. */
  readonly ready: boolean;
  /**
   * Tells the planner which stop is being carried, or that none is, so the
   * strip offers its other days. Null on a trip of one day, where a stop has
   * only its own day to go to.
   */
  readonly onCarry: ((stopId: string | null) => void) | null;
  /** Lets a stop go on another stop's place in the day, which puts it there. */
  readonly onMove: (from: number, to: number) => void;
}

/** The strip of days, which runs on sideways under a finger held near either end of it. */
function stripOf(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".day-tabs");
}

/**
 * A stop on a phone carried along its day or onto another day in the strip,
 * as a day in the strip is carried: a finger holds the card first, since a
 * finger moving at once is scrolling the day, and the day scrolls. A mouse,
 * on a window narrow enough to be laid out as a phone, lifts it once it has
 * been dragged a few pixels, so a click still opens the place.
 *
 * Lifted, a picture of the card goes wherever the finger takes it, drawn over
 * the page, while the card keeps its place in the day with nothing on it.
 * Every other card is offered, and so is every other day in the strip; the
 * one under the finger is where it goes. Between two cards, where a leg is,
 * it stays on the card it was last over, and above the first card or below
 * the last it is that card, so a stop can be carried to either end of the
 * day without landing exactly on the end one. Held near the top or the foot
 * of the window the page runs on under it, so a strip scrolled out of sight
 * comes back, and held near either end of the strip, level with it, the
 * strip runs on, so a day not in sight can be reached.
 *
 * Let go on another card, the stop takes its place, the cards between closing
 * up, as a card dragged on a desk does. Let go on a day, it goes last on that
 * day, as Move to another day in its sheet takes it. Let go over its own
 * place, over the strip but not a day, cut off, or put down with Escape, it
 * goes back and nothing moves.
 */
export function useStopCarry({ day, stopIds, ready, onCarry, onMove }: StopCarryOptions): StopCarry {
  const dayDrop = useDayDrop();
  const press = useRef<Press | null>(null);
  /** Whether the latest press carried a stop, so the click that ends it opens nothing. */
  const carried = useRef(false);
  const [lifted, setLifted] = useState<CarriedStop | null>(null);

  /** Every card on the day, measured down the content of what it scrolls in. */
  const measure = (scroller: HTMLElement | null): readonly CardSpan[] => {
    const scrolled = scrolledBy(scroller);
    return Array.from(
      day.current?.querySelectorAll<HTMLElement>("[data-stop-at]") ?? [],
      (element) => {
        const box = element.getBoundingClientRect();
        return { index: Number(element.dataset.stopAt), top: box.top + scrolled, bottom: box.bottom + scrolled };
      },
    );
  };

  /** The picture drawn where the finger is, and what it is over: a day in the strip, or a card. */
  const follow = (held: Press): void => {
    const strip = stripOf();
    held.overStrip = strip !== null && overTheStrip(held.x, held.y, strip.getBoundingClientRect());
    const overDay = dayUnder(held.x, held.y, daySpans());
    if (overDay !== held.overDay) {
      held.overDay = overDay;
      dayDrop.setOverDay(overDay);
    }
    if (!held.overStrip) {
      held.overCard = cardUnder(held.y + scrolledBy(held.scroller), held.cards, held.overCard);
    }
    setLifted({
      index: held.index,
      left: held.x - held.grabX,
      top: held.y - held.grabY,
      width: held.width,
      over: held.overStrip || held.overCard === held.index ? null : held.overCard,
      overStrip: held.overStrip,
    });
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

  /** The card lifts: every card is measured where it is, and from here its picture goes with the finger. */
  const liftUp = (held: Press): void => {
    const own = day.current?.querySelector<HTMLElement>(`[data-stop-at="${String(held.index)}"]`);
    if (own === null || own === undefined) {
      return;
    }
    const box = own.getBoundingClientRect();
    held.grabX = held.fromX - box.left;
    held.grabY = held.fromY - box.top;
    held.width = box.width;
    held.scroller = scrollerOf(own);
    held.cards = measure(held.scroller);
    held.lifted = true;
    carried.current = true;
    onCarry?.(stopIds[held.index] ?? null);
    follow(held);
    held.frame = requestAnimationFrame(runOn);
    window.addEventListener("keydown", held.putBack);
  };

  /**
   * Let go: on a day in the strip the stop goes there, and on another card it
   * takes that card's place; anywhere else, or cut off, it goes back.
   */
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
    setLifted(null);
    if (drop && held.overDay !== null) {
      // The planner stops carrying it as it moves it.
      dayDrop.dropOnDay(held.overDay);
      return;
    }
    onCarry?.(null);
    if (drop && !held.overStrip && held.overCard !== held.index) {
      onMove(held.index, held.overCard);
    }
  };

  const pressDown = (event: PointerEvent<HTMLButtonElement>, index: number): void => {
    carried.current = false;
    if (!ready || press.current !== null || event.button !== 0) {
      return;
    }
    const finger = event.pointerType !== "mouse";
    // A finger's pointer stays with the card it went down on of its own
    // accord. A mouse's is asked to, so a quick drag that leaves the card
    // before it has lifted is still this card's.
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
      y: event.clientY,
      grabX: 0,
      grabY: 0,
      width: 0,
      scroller: null,
      cards: [],
      overCard: index,
      overStrip: false,
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
   * listener of its own on the day, because React listens to a moving finger
   * passively, and a passive listener cannot stop the scroll; on the day
   * rather than the window, so a swipe anywhere else is never held up by it.
   */
  useEffect(() => {
    const node = day.current;
    if (!ready || node === null) {
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
  }, [ready, day]);

  /** A day that goes while a card is pressed lets go of the press, as letting go does. */
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
    carried: lifted,
    handlers: (index) =>
      !ready
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
