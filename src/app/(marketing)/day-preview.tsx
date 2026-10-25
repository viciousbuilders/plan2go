import type { ReactNode } from "react";
import { TrainIcon, WalkIcon } from "@/ui/icons";
import { headlineFont } from "./headline-font";

/**
 * A day as the planner lays one out, for the eye only: its places in order,
 * numbered, and how long the way from each to the next takes, which is what
 * the words over it promise. Drawn to "plan2go First Page v5", on a round of
 * each of the page's two accents, with the planner's own marks for getting
 * there. It is nobody's trip, so a screen reader is not given it, and the
 * sentence above says the same.
 */
export function DayPreview() {
  return (
    <div aria-hidden="true" className="relative max-w-[400px] py-2 pl-2">
      <span className="absolute -top-6 -right-2 size-[180px] rounded-pill bg-sage-100" />
      <span className="absolute -bottom-4 -left-5 size-24 rounded-pill bg-terracotta-100" />
      <div className="relative flex max-w-[300px] flex-col gap-2.5 rounded-[24px] bg-sheet px-5 pt-[18px] pb-5 shadow-md">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className={`${headlineFont.className} text-[17px] leading-none text-ink`}>
            Day 2 · Sydney
          </span>
          <span className="rounded-pill bg-sage-100 px-2 py-[5px] text-[11px] leading-none font-bold text-sage-800">
            3 places
          </span>
        </div>
        {/* Sydney's three best known sights, in the order a day takes them:
            on foot round the harbour from the Opera House to the Bridge,
            then out to the beach on a train and a bus. */}
        <Stop at="1" name="Sydney Opera House" area="Bennelong Point" />
        <Leg icon={<WalkIcon size={14} strokeWidth={2.75} className="flex-none" />} time="17 min" />
        <Stop at="2" name="Sydney Harbour Bridge" area="The Rocks" />
        <Leg icon={<TrainIcon size={14} strokeWidth={2.75} className="flex-none" />} time="42 min" />
        <Stop at="3" name="Bondi Beach" area="Eastern Suburbs" last />
      </div>
    </div>
  );
}

/** A place on the day, under its number: in the accent, and the last in the second accent. */
function Stop({
  at,
  name,
  area,
  last = false,
}: {
  readonly at: string;
  readonly name: string;
  readonly area: string;
  readonly last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`${headlineFont.className} grid size-7 flex-none place-items-center rounded-pill text-[14px] leading-none text-sheet ${
          last ? "bg-sage" : "bg-terracotta"
        }`}
      >
        {at}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14px] leading-[1.2] font-bold text-ink">{name}</span>
        <span className="text-[12px] leading-[1.2] font-medium text-ink/66">{area}</span>
      </span>
    </div>
  );
}

/** The way from one place to the next: a rule down from the number, and how long it takes. */
function Leg({ icon, time }: { readonly icon: ReactNode; readonly time: string }) {
  return (
    <div className="flex items-center gap-2 pl-[13px]">
      <span className="h-5 w-0.5 rounded-[2px] bg-neutral-300" />
      <span className="flex h-6 items-center gap-1.5 rounded-pill bg-paper px-2.5 text-[12px] leading-none font-semibold text-ink/66">
        {icon}
        {time}
      </span>
    </div>
  );
}
