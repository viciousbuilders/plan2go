"use client";

import { PencilIcon } from "@/ui/icons";
import { ENDS } from "../day-ends";

/**
 * An end of a day's own part of its sheet on a phone, under the place's name,
 * as a stop has its own: for someone who may edit, the way to put another
 * place there without taking this one off first. It goes to the search on the
 * map, which finds that end as the card offering one sends it to, and the
 * place chosen there takes this one's place. The sheet's own button, under
 * this, takes it off.
 *
 * One of the stop's pills for moving it, as wide as the sheet and as tall as
 * the button under it: an outline of `rule` on the sheet, its words at the
 * small step in 600, a step quieter than the button in the accent.
 *
 * On a desk the row beside the map changes it, and this is not drawn.
 */
export function EndDetails({
  which,
  onChange,
}: {
  readonly which: keyof typeof ENDS;
  /** Takes the reader to the search for this end. */
  readonly onChange: () => void;
}) {
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={onChange}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-pill border-[1.5px] border-rule px-4 text-small/none font-semibold whitespace-nowrap text-ink hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      >
        <PencilIcon size={12} strokeWidth={2.75} />
        {ENDS[which].changePoint}
      </button>
    </div>
  );
}
