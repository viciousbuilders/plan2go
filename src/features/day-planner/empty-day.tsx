import { SearchIcon } from "@/ui/icons";

interface EmptyDayProps {
  /** The day as it is written in the tabs, so the sentence names it. */
  readonly dayName: string;
  /**
   * Takes the reader to the search field. Null for a reader who cannot edit,
   * who is told where places come from and offered nothing to press.
   */
  readonly onFindPlace: (() => void) | null;
}

export function EmptyDay({ dayName, onFindPlace }: EmptyDayProps) {
  return (
    /*
     * Between the two ends of the day rather than in place of them: a day
     * with nowhere to go still has somewhere to start from, and the buttons
     * for those are above and below this. On the stop card's grid, with no
     * card under it, since a card on this panel is a stop: the line the stops
     * will hang on runs down the marker column, through the middle of the
     * ends' marks, dashed in the accent because nothing hangs on it yet, and
     * the words are set left beside it, on the stops' left edge. The line
     * stops six short of this block's top and foot, eighteen clear of the
     * rows with the twelve every block keeps, so it reads as the day's own
     * line and not as one tying the two rows together.
     */
    <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-[13px] px-[17px] py-1.5">
      <span className="thread-waiting justify-self-center" aria-hidden="true" />
      <div className="flex flex-col items-start py-3">
        <h2 className="font-display text-title text-balance text-ink">
          Nothing planned for {dayName} yet
        </h2>
        <p className="mt-[6px] max-w-[38ch] text-body text-pretty text-ink-muted">
          Search for a place, have a look at it, and add it to the day.
        </p>
        {onFindPlace === null ? null : (
          /* The search field is over the map, which on a desk is the other
             pane and on a phone is a strip above this: either way it is not
             where the eye is, so the empty day points at it. */
          /* The same action as the next number on the rail at the foot of the
             last card, in the state of the day with no card to hang it from:
             here it is the one thing to do, so it is the accent's solid pill
             rather than a dashed slot on the line beside it. */
          <button
            type="button"
            onClick={onFindPlace}
            className="mt-[14px] flex h-10 items-center gap-2 rounded-pill bg-terracotta px-5 text-small/none font-semibold text-paper hover:bg-terracotta-600 active:bg-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            <SearchIcon size={14} strokeWidth={2.75} />
            Find a place
          </button>
        )}
      </div>
    </div>
  );
}
