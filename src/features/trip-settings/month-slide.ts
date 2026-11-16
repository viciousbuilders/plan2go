import type { RefObject } from "react";
import { flushSync } from "react-dom";
import "./month-slide.css";

/** Which way the months move: on to a later month, or back to an earlier one. */
export type MonthWay = "month-on" | "month-back";

/**
 * Whether the months can slide: the browser has view transitions and the
 * reader has not asked for less motion. Otherwise they change at once.
 */
export function canSlideMonths(): boolean {
  return (
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Whether the top of a phone's month is in sight: not scrolled under the line
 * with the steps held over it, nor out of the top of the sheet it is on.
 * While it slides the month is a picture drawn over the whole page, cut to
 * its own box but not to whatever scrolls it, so a month partly out of sight
 * there changes at once rather than being drawn over what hides it. Its foot
 * is never in the way: past the foot of a phone's sheet is the window's.
 */
export function monthInSight(month: HTMLElement): boolean {
  const box = month.getBoundingClientRect();
  const atTop = document.elementFromPoint(box.left + box.width / 2, box.top + 1);
  return atTop !== null && month.contains(atTop);
}

/**
 * Moves the months on show as a view transition that slides them along by
 * one (see month-slide.css), the root saying which way they go while it
 * runs, as a day's slide does. Said only while it runs, so the months are
 * never set apart from the page in a transition that is not theirs: once it
 * is done, if no other has started since, the root says nothing again.
 */
export function slideMonths(
  way: MonthWay,
  change: () => void,
  latest: RefObject<ViewTransition | null>,
): void {
  const root = document.documentElement;
  root.dataset.slide = way;
  const transition = document.startViewTransition(() => {
    flushSync(change);
  });
  latest.current = transition;
  void transition.finished.finally(() => {
    if (latest.current === transition && root.dataset.slide === way) {
      delete root.dataset.slide;
      latest.current = null;
    }
  });
}
