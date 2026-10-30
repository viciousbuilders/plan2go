"use client";

import { Fragment, useEffect, useRef } from "react";
import type { ComputedLeg } from "@/core/time/compute-day";
import { routeStroke } from "@/features/trip-map/route-style";
import { ArrowRightIcon } from "@/ui/icons";
import { outsidePressIsTaken } from "@/ui/use-outside-press";
import type { PlannedDay } from "../compute-trip";
import { MARKS } from "../day-ends";
import { formatDayDate, formatDayTab } from "../format-day-date";
import { formatDayTime } from "../format-day-time";
import { legColor, MODE_ICON, MODE_WORDS } from "../leg-marks";

/** What is picked out on a phone's map: a stop, by its id, or one end of the open day. */
export type Picked =
  | { readonly kind: "stop"; readonly stopId: string }
  | { readonly kind: "end"; readonly which: "start" | "end" };

/** How a card is found in the row by what it stands for. */
function pickKey(pick: Picked): string {
  return pick.kind === "stop" ? pick.stopId : pick.which;
}

interface MapDayProps {
  readonly days: readonly PlannedDay[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  /** The stop or end of the day picked out on the map, by its card or its marker, or null. */
  readonly picked: Picked | null;
  readonly onPick: (picked: Picked) => void;
  /** Opens the stop that is already picked out, to see what the place is like. */
  readonly onOpen: (stopId: string) => void;
  /** Opens the end of the day that is already picked out, the same way. */
  readonly onOpenEnd: (which: "start" | "end") => void;
}

/** How far apart two cards stand, which is how long the leg between them is drawn. */
const LEG_LENGTH = 60;

/**
 * How the day gets from one place to the next, between their cards: the leg as
 * the map draws it, its pattern in its own ink over a casing of paper, from
 * one card's edge to the other's, and at its middle the glyph its row on Plan
 * carries, on a bead of raised paper ringed in the same ink. So the row is the
 * key to the lines over it: a dotted line on the map is the walk drawn with
 * the same dots in the same colour down here. The line is as thin as a desk's
 * key draws its samples, since this is a sample and not a route. Read out as
 * the way, between the two places it joins.
 */
function StripLeg({ leg }: { readonly leg: ComputedLeg }) {
  const Icon = MODE_ICON[leg.mode];
  const stroke = routeStroke(leg.mode);
  const weight = stroke.roundCaps ? 3.6 : 3.2;
  const line = {
    d: `M0 4h${String(LEG_LENGTH)}`,
    strokeDasharray: stroke.dashArray ?? undefined,
    strokeLinecap: stroke.roundCaps ? ("round" as const) : ("butt" as const),
  };
  return (
    // Over the row's gap on either side, so the line runs card to card.
    <span
      className="relative -mx-[10px] grid shrink-0 place-items-center self-center"
      style={{ width: LEG_LENGTH, color: legColor(leg.index) }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${String(LEG_LENGTH)} 8`}
        width={LEG_LENGTH}
        height="8"
        className="absolute top-1/2 left-0 -translate-y-1/2"
      >
        <path {...line} stroke="var(--color-paper)" strokeWidth={weight + 2.2} />
        <path {...line} stroke="currentColor" strokeWidth={weight} />
      </svg>
      <span className="relative grid h-6 w-6 place-items-center rounded-pill border-2 border-current bg-paper-raised shadow-sm">
        <Icon size={13} strokeWidth={2.75} />
      </span>
      <span className="sr-only">{MODE_WORDS[leg.mode]}</span>
    </span>
  );
}

/** A card in the row, a stop's or an end's: one size and one surface for both. */
const CARD =
  "flex w-[250px] shrink-0 items-center gap-3 rounded-card border-2 bg-paper-raised px-[14px] py-[13px] text-left shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

/**
 * One end of the day in the row, laid out as a stop's card is: the end's own
 * mark where a stop has its number, the sage square with one corner cut and
 * its glyph, as large as a stop's disc; the place's name; and what the day
 * does there with the time it does it, "Leave at 09:00", "Finish at 17:40",
 * or "Back at 17:40" where the day ends where it started, the words the day's
 * own view says. Picked out, its edge takes sage, the colour of its marker's
 * ring on the map, as a stop's card takes the accent. With no time, because
 * a leg on the way could not be answered, it says the place alone.
 */
function EndCard({
  which,
  day,
  on,
  onPress,
}: {
  readonly which: "start" | "end";
  readonly day: PlannedDay;
  readonly on: boolean;
  readonly onPress: () => void;
}) {
  const endpoint = day.plan[which];
  if (endpoint === null) {
    return null;
  }
  const Mark = MARKS[which];
  const time = which === "start" ? day.computed.begins : day.computed.ends;
  const back = which === "end" && day.plan.start?.place.id === endpoint.place.id;
  const verb = which === "start" ? "Leave at" : back ? "Back at" : "Finish at";
  return (
    <button
      type="button"
      data-pick={which}
      aria-pressed={on}
      onClick={onPress}
      className={`${CARD} ${on ? "border-sage-600" : "border-transparent"}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[14px_14px_14px_4px] bg-sage-600 text-paper">
        <Mark size={15} strokeWidth={2.75} />
        <span className="sr-only">{which === "start" ? "Start of the day" : "End of the day"}</span>
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-display text-place text-ink">{endpoint.place.name}</span>
        {time === null ? null : (
          <span className="text-meta/none font-semibold whitespace-nowrap text-ink-muted tabular-nums">
            {`${verb} ${formatDayTime(time)}`}
          </span>
        )}
      </span>
    </button>
  );
}

/** Laid over the map rather than on paper, so each thing stands on a floating control's shadow. */
const CHIP =
  "shrink-0 rounded-pill border px-[15px] py-[11px] text-small/none font-bold whitespace-nowrap shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

/**
 * What a phone's map view carries over the map, as design 1b of "PlanToGo
 * iPhone app" draws it, along its foot: a chip for every day, "Day 1 · Sat
 * 10", the open one filled in the accent's deepest brown, so the map can go
 * from day to day without going back to the list; and under the days the day
 * in order, a card for where it starts, every stop and where it ends, the
 * ends when it has them: a stop's number on the disc the map marks it with,
 * an end's mark, the name, and the times. Each leg is drawn between the cards
 * of the two places it joins, its way on a bead at its middle, which is how a
 * phone's map is given the key a desk draws under its own. A day with no stop
 * says so between its ends, and draws no leg across the words. Each row
 * scrolls sideways over the map. The search stands over the map's top, laid
 * there by whoever holds it, and its list opens over these rows, which stay
 * where they are under it.
 * While it is open they still scroll under a finger, and a press on them
 * closes the search and does nothing else, as a press on the map does: it is
 * the search's, which has heard it and gone by the time the press lands, so
 * whether one was open is asked as the press begins.
 *
 * A card pressed picks its place out: the card takes an edge, the accent for a
 * stop and sage for an end, and its marker on the map is drawn large, as a
 * marker under the pointer is on a desk. Pressed again, it opens the place. A
 * marker pressed picks its card out the same way, and the row brings that card
 * into sight.
 *
 * Over the map, under the bar of views at the foot of the window: the cards
 * stand twelve clear of the bar. Fixed to the window rather than to the map,
 * so whoever lays them out can lay them with the search, over the clear page
 * it lays over the map. On a phone only.
 */
export function MapDay({
  days,
  selectedIndex,
  onSelect,
  picked,
  onPick,
  onOpen,
  onOpenEnd,
}: MapDayProps) {
  const selected = days[selectedIndex] ?? days[0];
  const cards = useRef<HTMLDivElement | null>(null);
  /** Whether the press under way began with the search open, and so is the search's. */
  const spent = useRef(false);

  /** A place picked on the map has its card brought into sight, by the least the row can move. */
  useEffect(() => {
    if (picked === null) {
      return;
    }
    cards.current
      ?.querySelector<HTMLElement>(`[data-pick="${pickKey(picked)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [picked]);

  if (selected === undefined) {
    return null;
  }
  /** With no start point the first stop has no leg arriving at it. */
  const legOffset = selected.plan.start === null ? -1 : 0;
  const stops = selected.computed.stops;
  /** The leg out to the end, drawn only from a stop's card: with no stop it would run across the words. */
  const legToEnd =
    stops.length === 0 || selected.plan.end === null
      ? undefined
      : selected.computed.legs[selected.computed.legs.length - 1];
  const endPicked = (which: "start" | "end"): boolean =>
    picked?.kind === "end" && picked.which === which;
  const pressEnd = (which: "start" | "end"): void => {
    if (endPicked(which)) {
      onOpenEnd(which);
    } else {
      onPick({ kind: "end", which });
    }
  };
  return (
    /* One column twelve clear of the bar of views: the days, and under them
       the day's places, 8px apart. Each row keeps room inside it for its
       shadows, which a row that scrolls would otherwise cut off. */
    <div
      onPointerDownCapture={() => {
        spent.current = outsidePressIsTaken();
      }}
      // A finger that went on to scroll a row ends no press, and leaves none
      // to be spent on whatever is pressed next.
      onPointerCancelCapture={() => {
        spent.current = false;
      }}
      onClickCapture={(event) => {
        if (spent.current) {
          spent.current = false;
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      className="fixed inset-x-0 bottom-[calc(max(20px,env(safe-area-inset-bottom))+66px)] z-[2] flex flex-col lg:hidden"
    >
      <div
        role="group"
        aria-label="Days of this trip"
        className="flex gap-[6px] overflow-x-auto px-4 pt-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {days.map((day, index) => {
          const on = index === selectedIndex;
          return (
            <button
              key={day.plan.id}
              type="button"
              aria-pressed={on}
              aria-label={`Day ${String(index + 1)}, ${formatDayDate(day.plan.date)}`}
              onClick={() => {
                onSelect(index);
              }}
              className={`${CHIP} ${
                on
                  ? "border-terracotta-800 bg-terracotta-800 text-paper"
                  : "border-rule bg-paper-raised text-ink hover:bg-paper-sunken"
              }`}
            >
              {`Day ${String(index + 1)} · ${formatDayTab(day.plan.date)}`}
            </button>
          );
        })}
      </div>

      <div
        ref={cards}
        role="group"
        aria-label={`Places on Day ${String(selectedIndex + 1)}`}
        className="flex gap-[10px] overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <EndCard
          which="start"
          day={selected}
          on={endPicked("start")}
          onPress={() => {
            pressEnd("start");
          }}
        />

        {stops.map((stop, index) => {
          const on = picked?.kind === "stop" && picked.stopId === stop.stopId;
          // The leg arriving at this stop, from the stop before it or from
          // the start of the day, between the two cards.
          const leg = selected.computed.legs[index + legOffset];
          return (
            <Fragment key={stop.stopId}>
              {leg === undefined ? null : <StripLeg leg={leg} />}
              <button
                type="button"
                data-pick={stop.stopId}
                aria-pressed={on}
                onClick={() => {
                  if (on) {
                    onOpen(stop.stopId);
                  } else {
                    onPick({ kind: "stop", stopId: stop.stopId });
                  }
                }}
                className={`${CARD} ${on ? "border-terracotta" : "border-transparent"}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-terracotta font-display text-body/none font-semibold text-paper tabular-nums">
                  <span aria-hidden="true">{index + 1}</span>
                  <span className="sr-only">Stop {index + 1}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-display text-place text-ink">{stop.placeName}</span>
                  {stop.arrival === null ? null : (
                    <span className="flex items-center gap-[5px] text-meta/none font-semibold whitespace-nowrap text-ink-muted tabular-nums">
                      {formatDayTime(stop.arrival)}
                      {stop.departure === null ? null : (
                        <>
                          <ArrowRightIcon size={12} strokeWidth={2.5} className="shrink-0" />
                          <span className="sr-only">to</span>
                          {formatDayTime(stop.departure)}
                        </>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </Fragment>
          );
        })}

        {/* Between the ends when there are any, and never narrower than its
            words on one line, or a row of ends would squeeze it to a column. */}
        {stops.length === 0 ? (
          <p className="min-w-[200px] flex-1 rounded-card bg-paper-raised px-[18px] py-4 text-body font-semibold text-ink shadow-md">
            No stops on this day yet
          </p>
        ) : null}

        {legToEnd === undefined ? null : <StripLeg leg={legToEnd} />}
        <EndCard
          which="end"
          day={selected}
          on={endPicked("end")}
          onPress={() => {
            pressEnd("end");
          }}
        />
      </div>
    </div>
  );
}
