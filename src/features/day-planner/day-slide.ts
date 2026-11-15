import type { RefObject } from "react";
import { flushSync } from "react-dom";
import "./day-slide.css";

/** Which way a day change slides: on to a later day, or back to an earlier one. */
export type DayWay = "day-on" | "day-back";

/**
 * Whether a day change can slide: the browser has view transitions and the
 * reader has not asked for less motion. Otherwise the day changes at once.
 */
export function canSlideDays(): boolean {
  return (
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Changes the day as a view transition that slides it across (see
 * day-slide.css), the root saying which way it goes while it runs. Said only
 * while it runs: a name left on the day after it would set the day apart from
 * the page around it in every transition to come. So once it is done, if no
 * other has started since, the root says nothing again.
 *
 * Whoever chooses a day keeps the latest of its own slides, the strip of days
 * and a phone's row of days on the map alike.
 */
export function slideDay(
  way: DayWay,
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
