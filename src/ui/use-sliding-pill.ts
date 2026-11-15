import type { RefObject } from "react";
import { useLayoutEffect, useRef } from "react";
import "./sliding-pill.css";

/**
 * Lays a pill under the chosen one of a row of buttons, and slides it along to
 * whichever is chosen next (see sliding-pill.css). Gives back the row's `ref`.
 *
 * The row is positioned, so its buttons' offsets are measured from it, and
 * draws, in this order: a `sliding-pill` span, its buttons, the row's own
 * children, each positioned so it stands over the pill and counted in the
 * order they come, and a `sliding-ink` span holding the buttons' words again
 * in the colour they take on the pill, laid out as the buttons are. Until the
 * pill has been placed the chosen button paints its own, and once it has,
 * the row carries `data-placed`, which the buttons can read to stop.
 *
 * Where the pill goes is told to the stylesheet rather than held as state,
 * since only the pill moves and the transitions do the moving, and told again
 * whenever the row changes size, which is when a button can have moved
 * without another being chosen.
 */
export function useSlidingPill<T extends HTMLElement>(chosen: number): RefObject<T | null> {
  const row = useRef<T | null>(null);

  useLayoutEffect(() => {
    const element = row.current;
    if (element === null) {
      return;
    }
    const place = (): void => {
      const on = element.querySelectorAll<HTMLElement>(":scope > button")[chosen];
      if (on === undefined) {
        return;
      }
      element.style.setProperty("--pill-x", `${String(on.offsetLeft)}px`);
      element.style.setProperty("--pill-y", `${String(on.offsetTop)}px`);
      element.style.setProperty("--pill-w", `${String(on.offsetWidth)}px`);
      element.style.setProperty("--pill-h", `${String(on.offsetHeight)}px`);
      element.dataset.placed = "";
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [chosen]);

  return row;
}
