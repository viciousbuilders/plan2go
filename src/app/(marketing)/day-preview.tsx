import type { ReactNode } from "react";
import type { TravelMode } from "@/core/model/leg";
import { MODE_ICON, MODE_WORDS } from "@/features/day-planner/leg-marks";
import { HomeIcon } from "@/ui/icons";
import { headlineFont } from "./headline-font";

/**
 * A day as the planner lays one out, for the eye only: where it sets out
 * from, its places in order, numbered, and how long the way from each to the
 * next takes, which is what the words over it promise. Drawn to "plan2go
 * First Page v5", on a round of each of the page's two accents, with the
 * planner's own marks for where a day starts and for getting there. It is
 * nobody's trip, so a screen reader is not given it, and the sentence above
 * says the same.
 */
export function DayPreview() {
  return (
    <div aria-hidden="true" className="relative max-w-[400px] py-2">
      <span className="absolute -top-6 -right-2 size-[180px] rounded-pill bg-sage-100" />
      <span className="absolute -bottom-4 -left-5 size-24 rounded-pill bg-terracotta-100" />
      <div className="relative flex max-w-[300px] flex-col gap-2.5 rounded-[28px] bg-sheet px-5 pt-[18px] pb-5 shadow-md">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className={`${headlineFont.className} text-[18px] leading-none text-ink`}>
            Day 2 · Sydney
          </span>
          {/* The two numbered stops. The hotel is where the day sets out
              from, not a place on it, as the planner counts a day. */}
          <span className="flex h-6 items-center rounded-pill bg-sage-100 px-2.5 text-[12px] leading-none font-bold text-sage-800">
            2 places
          </span>
        </div>
        {/* Out from the hotel to Sydney's two best known sights: in on a
            train to the Opera House, then on foot round the harbour to the
            Bridge. The hotel is the reader's own rather than one named, so
            the page sends nobody to any one hotel. */}
        <Place mark={<StartMark />} name="Your hotel" area="Darling Harbour" />
        <Leg mode="transit" time="21 min" />
        <Place mark={<StopNumber at="1" />} name="Sydney Opera House" area="Bennelong Point" />
        <Leg mode="walk" time="17 min" />
        <Place mark={<StopNumber at="2" />} name="Sydney Harbour Bridge" area="The Rocks" />
      </div>
    </div>
  );
}

/** A place on the day, beside its mark. */
function Place({
  mark,
  name,
  area,
}: {
  readonly mark: ReactNode;
  readonly name: string;
  readonly area: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {mark}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] leading-[1.2] font-semibold text-ink">{name}</span>
        <span className="text-[12px] leading-[1.2] font-medium text-ink-muted">{area}</span>
      </span>
    </div>
  );
}

/** A stop's mark, as the planner draws one: its number on a disc in the accent. */
function StopNumber({ at }: { readonly at: string }) {
  return (
    <span
      className={`${headlineFont.className} grid size-7 flex-none place-items-center rounded-pill bg-terracotta text-[14px] leading-none text-sheet`}
    >
      {at}
    </span>
  );
}

/**
 * Where the day starts, marked as the planner marks it: a house on a square
 * in the second accent with one corner cut, a different shape from a stop
 * rather than only a different colour. Drawn at this card's size, 28px.
 */
function StartMark() {
  return (
    <span className="grid size-7 flex-none place-items-center rounded-[12px_12px_12px_4px] bg-sage-600 text-paper">
      <HomeIcon size={14} strokeWidth={2.75} />
    </span>
  );
}

/**
 * The way from one place to the next: a rule down from the mark, then the
 * way's glyph, its name and how long it takes, taken from the planner so the
 * card says it the way a planned day does, "Walk 17 min". The name and not
 * the glyph alone, as the planner never gives a way of travelling by its
 * glyph, and at this size a walk's footprints read as a smudge.
 */
function Leg({ mode, time }: { readonly mode: TravelMode; readonly time: string }) {
  const Icon = MODE_ICON[mode];
  return (
    <div className="flex items-center gap-2 pl-[13px]">
      <span className="h-5 w-0.5 rounded-[2px] bg-neutral-300" />
      <span className="flex h-6 items-center gap-1.5 rounded-pill bg-paper px-2.5 text-[12px] leading-none font-semibold whitespace-nowrap text-ink-muted">
        <Icon size={14} strokeWidth={2.75} className="flex-none" />
        <span className="text-ink">{MODE_WORDS[mode]}</span>
        <span className="font-bold text-ink">{time}</span>
      </span>
    </div>
  );
}
