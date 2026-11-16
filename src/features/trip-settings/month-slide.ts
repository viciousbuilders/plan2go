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
