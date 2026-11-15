"use client";

import { FileDownIcon, ListIcon, MapIcon } from "@/ui/icons";
import { useSlidingPill } from "@/ui/use-sliding-pill";
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

/** Each of the three as a button, standing over the pill. */
const TAB = `${SHAPE} relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta`;

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
export const VIEWS = [
  { view: "plan", label: "Plan", Icon: ListIcon },
  { view: "map", label: "Map", Icon: MapIcon },
  { view: "export", label: "Export", Icon: FileDownIcon },
] as const;

/**
 * The bar of views at the foot of a phone's window, as design 1b of "PlanToGo
 * iPhone" floats it: a pill of ink under the deepest shadow, centred twenty
 * clear of the window's foot, holding the day's list, the map and the export.
 * The view on show stands on a pill of paper, which slides along to the view
 * chosen, and the others are paper on the ink. It stays put while the views
 * slide under it (see view-tabs.css). Never on a desk, where the map and the
 * list are side by side and the export is a dialog.
 */
export function ViewTabs({ view, onView, exportDisabled }: ViewTabsProps) {
  const bar = useSlidingPill<HTMLElement>(VIEWS.findIndex((each) => each.view === view));

  return (
    <nav
      ref={bar}
      aria-label="Views of this trip"
      className="view-tabs group/views fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-pill bg-ink p-[6px] shadow-lg lg:hidden print:hidden"
    >
      <span aria-hidden="true" className="sliding-pill rounded-pill bg-paper" />
      {VIEWS.map(({ view: which, label, Icon }) => (
        <button
          key={which}
          type="button"
          aria-pressed={view === which}
          disabled={which === "export" && exportDisabled}
          onClick={() => {
            onView(which);
          }}
          className={`${TAB} ${look(view === which)} disabled:opacity-45 disabled:hover:text-paper/75`}
        >
          <Icon size={18} strokeWidth={2.5} />
          {label}
        </button>
      ))}
      {/* The same three in ink, laid out as the buttons are, cut to the pill. */}
      <span
        aria-hidden="true"
        className="sliding-ink pointer-events-none absolute inset-0 gap-1 p-[6px] text-ink"
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
