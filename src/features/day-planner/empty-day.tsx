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
     * will hang on, dashed in the accent because nothing hangs on it yet, and
     * the words set left beside it, on the stops' left edge.
     *
     * The line runs from the row above to the row below, where the day starts
     * to where it ends, two short of each as the thread is short of what it
     * joins. It stopped eighteen clear of both, and stood between the two
     * rows tied to neither. So the rows keep no room from this block, and the
     * room is kept beside the words instead: thirty above them and below, the
     * twelve a block keeps from the next and the eighteen there were inside
     * it, so the words stand where they did.
     *
     * In the thread's own column, on a leg's grid, thirteen nearer the edge
     * than the ends' marks: where the thread runs once there are stops, and
     * where the leg to the end runs when there is one, so the line goes on
     * into it as one line. Down the middle of the marks, it met the leg's
     * line thirteen to the side of it. The words keep the stops' left edge
     * across the wider gap.
     */
    <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-[26px] pr-[17px] pl-1">
      <div className="flex justify-center py-[2px]" aria-hidden="true">
        <span className="thread-waiting" />
      </div>
      <div className="flex flex-col items-start py-[30px]">
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
          /* The same action as the next number at the foot of the last card,
             in the state of the day with no card to hang it from: here it is
             the one thing to do, so it is the accent's solid pill rather than
             a dashed slot at the foot of a card. */
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
