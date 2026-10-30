"use client";

import { Fragment, useEffect, useRef } from "react";
import type { ComputedLeg } from "@/core/time/compute-day";
import { routeStroke } from "@/features/trip-map/route-style";
import { ArrowRightIcon } from "@/ui/icons";
import { outsidePressIsTaken } from "@/ui/use-outside-press";
import type { PlannedDay } from "../compute-trip";
import { formatDayDate, formatDayTab } from "../format-day-date";
import { formatDayTime } from "../format-day-time";
import { legColor, MODE_ICON, MODE_WORDS } from "../leg-marks";

interface MapDayProps {
  readonly days: readonly PlannedDay[];
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  /** The stop picked out on the map, by its card or its marker, or null. */
  readonly picked: string | null;
  readonly onPick: (stopId: string) => void;
  /** Opens the stop that is already picked out, to see what the place is like. */
  readonly onOpen: (stopId: string) => void;
}

/** How far apart two stops' cards stand, which is how long the leg between them is drawn. */
const LEG_LENGTH = 60;

/**
 * How the day gets from one stop to the next, between their cards: the leg as
 * the map draws it, its pattern in its own ink over a casing of paper, from
 * one card's edge to the other's, and at its middle the glyph its row on Plan
 * carries, on a bead of raised paper ringed in the same ink. So the row is the
 * key to the lines over it: a dotted line on the map is the walk drawn with
 * the same dots in the same colour down here. The line is as thin as a desk's
 * key draws its samples, since this is a sample and not a route. Read out as
 * the way, between the two stops it joins.
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

/** Laid over the map rather than on paper, so each thing stands on a floating control's shadow. */
const CHIP =
  "shrink-0 rounded-pill border px-[15px] py-[11px] text-small/none font-bold whitespace-nowrap shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

/**
 * What a phone's map view carries over the map, as design 1b of "PlanToGo
 * iPhone app" draws it, along its foot: a chip for every day, "Day 1 · Sat
 * 10", the open one filled in the accent's deepest brown, so the map can go
 * from day to day without going back to the list; and under the days a card
 * for every stop on the day, its number on the disc the map marks it with, its
 * name, and when it is reached and left, with the leg that joins two stops
 * drawn between their cards, its way on a bead at its middle, which is how a
 * phone's map is given the key a desk draws under its own. A leg from the
 * start or out to the end has a card on one side only and is not drawn
 * there. Each row scrolls sideways over the
 * map. The search stands over the map's top, laid there by whoever holds it,
 * and its list opens over these rows, which stay where they are under it.
 * While it is open they still scroll under a finger, and a press on them
 * closes the search and does nothing else, as a press on the map does: it is
 * the search's, which has heard it and gone by the time the press lands, so
 * whether one was open is asked as the press begins.
 *
 * A card pressed picks its stop out: the card takes the accent's edge and its
 * marker on the map is drawn large, as a marker under the pointer is on a
 * desk. Pressed again, it opens the place. A marker pressed picks its card out
 * the same way, and the row brings that card into sight.
 *
 * Over the map, under the bar of views at the foot of the window: the cards
 * stand twelve clear of the bar. Fixed to the window rather than to the map,
 * so whoever lays them out can lay them with the search, over the clear page
 * it lays over the map. On a phone only.
 */
export function MapDay({ days, selectedIndex, onSelect, picked, onPick, onOpen }: MapDayProps) {
  const selected = days[selectedIndex] ?? days[0];
  const cards = useRef<HTMLDivElement | null>(null);
  /** Whether the press under way began with the search open, and so is the search's. */
  const spent = useRef(false);

  /** A stop picked on the map has its card brought into sight, by the least the row can move. */
  useEffect(() => {
    if (picked === null) {
      return;
    }
    cards.current
      ?.querySelector<HTMLElement>(`[data-stop-id="${picked}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [picked]);

  if (selected === undefined) {
    return null;
  }
  /** With no start point the first stop has no leg arriving at it. */
  const legOffset = selected.plan.start === null ? -1 : 0;
  return (
    /* One column twelve clear of the bar of views: the days, and under them
       the day's stops, 8px apart. Each row keeps room inside it for its
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
        aria-label={`Stops on Day ${String(selectedIndex + 1)}`}
        className="flex gap-[10px] overflow-x-auto px-4 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {selected.computed.stops.map((stop, index) => {
          const on = stop.stopId === picked;
          // The leg from the stop before, between the two cards. The first
          // stop's comes from the start of the day, which has no card here.
          const leg = index === 0 ? undefined : selected.computed.legs[index + legOffset];
          return (
            <Fragment key={stop.stopId}>
              {leg === undefined ? null : <StripLeg leg={leg} />}
              <button
                type="button"
                data-stop-id={stop.stopId}
                aria-pressed={on}
                onClick={() => {
                  if (on) {
                    onOpen(stop.stopId);
                  } else {
                    onPick(stop.stopId);
                  }
                }}
                className={`flex w-[250px] shrink-0 items-center gap-3 rounded-card border-2 bg-paper-raised px-[14px] py-[13px] text-left shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${
                  on ? "border-terracotta" : "border-transparent"
                }`}
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

        {selected.computed.stops.length === 0 ? (
          <p className="flex-1 rounded-card bg-paper-raised px-[18px] py-4 text-body font-semibold text-ink shadow-md">
            No stops on this day yet
          </p>
        ) : null}
      </div>
    </div>
  );
}
