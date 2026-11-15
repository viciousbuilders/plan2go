"use client";

import { useLayoutEffect, useRef } from "react";
import { FileDownIcon, ListIcon, MapIcon } from "@/ui/icons";
import "./view-tabs.css";

/** What a phone shows of the trip: the day as a list, the map, or the export. */
export type View = "plan" | "map" | "export";

interface ViewTabsProps {
  readonly view: View;
  readonly onView: (view: View) => void;
  /** A trip with nothing on any day has nothing to export, and says so. */
  readonly exportDisabled: boolean;
}

/** The shape of each of the three: its glyph and its word, a finger's height. */
const SHAPE = "flex items-center gap-[7px] rounded-pill px-4 py-3 text-small/none font-bold whitespace-nowrap";

/** Each of the three as a button. */
const TAB = `${SHAPE} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta`;

/**
 * The view on show paints its own pill of paper until the bar's pill has been
 * laid under it, which from then on is the pill, and its words in ink are
 * drawn over it; the others are paper on the ink.
 */
function look(on: boolean): string {
  return on
    ? "bg-paper text-ink group-data-[placed]/views:bg-transparent group-data-[placed]/views:text-paper/75"
    : "text-paper/75 hover:text-paper";
}

/** The three views, in the order the bar holds them, each with its glyph. */
const VIEWS = [
  { view: "plan", label: "Plan", Icon: ListIcon },
  { view: "map", label: "Map", Icon: MapIcon },
  { view: "export", label: "Export", Icon: FileDownIcon },
] as const;

/**
 * The bar of views at the foot of a phone's window, as design 1b of "PlanToGo
 * iPhone" floats it: a pill of ink under the deepest shadow, centred twenty
 * clear of the window's foot, holding the day's list, the map and the export.
 * The view on show stands on a pill of paper, which slides along to the view
 * chosen (see view-tabs.css), and the others are paper on the ink. Never on a
 * desk, where the map and the list are side by side and the export is a
 * dialog.
 */
export function ViewTabs({ view, onView, exportDisabled }: ViewTabsProps) {
  const bar = useRef<HTMLElement | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  /**
   * Lays the pill under the view on show. Told to the stylesheet rather than
   * held as state, since only the pill moves and the transitions in
   * view-tabs.css do the moving. Said again whenever the bar changes size,
   * which is when a button can have moved without a new view being chosen.
   * Marked placed once it has been, and not before.
   */
  useLayoutEffect(() => {
    const element = bar.current;
    if (element === null) {
      return;
    }
    const place = (): void => {
      const on = buttons.current[VIEWS.findIndex((each) => each.view === view)];
      if (on === undefined || on === null) {
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
  }, [view]);

  return (
    <nav
      ref={bar}
      aria-label="Views of this trip"
      className="group/views fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-pill bg-ink p-[6px] shadow-lg lg:hidden print:hidden"
    >
      <span aria-hidden="true" className="view-pill rounded-pill bg-paper" />
      {VIEWS.map(({ view: which, label, Icon }, index) => (
        <button
          key={which}
          ref={(node) => {
            buttons.current[index] = node;
          }}
          type="button"
          aria-pressed={view === which}
          disabled={which === "export" && exportDisabled}
          onClick={() => {
            onView(which);
          }}
          className={`${TAB} relative ${look(view === which)} disabled:opacity-45 disabled:hover:text-paper/75`}
        >
          <Icon size={18} strokeWidth={2.5} />
          {label}
        </button>
      ))}
      {/* The same three in ink, laid out as the buttons are, cut to the pill. */}
      <span
        aria-hidden="true"
        className="view-ink pointer-events-none absolute inset-0 gap-1 p-[6px] text-ink"
      >
        {VIEWS.map(({ view: which, label, Icon }) => (
          <span key={which} className={SHAPE}>
            <Icon size={18} strokeWidth={2.5} />
            {label}
          </span>
        ))}
      </span>
    </nav>
  );
}
