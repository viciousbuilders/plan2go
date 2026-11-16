import type { RefObject } from "react";
import { flushSync } from "react-dom";
import "./menu-slide.css";

/** Which way the trip's menu turns: on to a page, or back to its rows. */
export type MenuWay = "menu-on" | "menu-back";

/**
 * Whether the menu can slide to a page and back: on a desk, where the menu
 * is a panel under its button, in a browser whose view transitions can nest
 * one picture inside another, which is what lets the panel cut the rows and
 * the page to itself as it changes size, and for a reader who has not asked
 * for less motion. Otherwise the page is turned at once. A phone's sheet
 * takes its page whole and turns it at once too.
 */
export function canSlideMenu(): boolean {
  return (
    "startViewTransition" in document &&
    CSS.supports("view-transition-group", "nearest") &&
    window.matchMedia("(min-width: 1024px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Turns the menu as a view transition that slides it (see menu-slide.css),
 * the root saying which way it goes while it runs, as a day's slide does.
 * Said only while it runs, so the menu is never set apart from the page in a
 * transition that is not its own: once it is done, if no other has started
 * since, the root says nothing again.
 */
export function slideMenu(
  way: MenuWay,
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
