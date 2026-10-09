"use client";

import { Fragment, useActionState, useLayoutEffect, useRef, useState } from "react";
import type { IsoDate } from "@/core/model/day";
import { MAX_STOP_DAYS, MAX_STOPS } from "@/core/model/trip";
import { formatDateRange } from "@/core/time/date-range";
import { addDays } from "@/core/time/zoned";
import { formatDayDate } from "@/features/day-planner/format-day-date";
import {
  CheckIcon,
  ClockIcon,
  CloseIcon,
  MinusIcon,
  PlaneIcon,
  PlusIcon,
  ShareIcon,
} from "@/ui/icons";
import { Notice } from "@/ui/notice";
import { useLocalToday } from "@/ui/use-local-today";
import type { CreateTripFormState } from "./create-trip-action";
import { createTripAction } from "./create-trip-action";
import { DepartureField } from "./departure-field";
import type { ChosenCity } from "./stop-search";
import { StopSearch } from "./stop-search";
import { FIELD_LABEL, FIELD_VALUE } from "./ticket-type";
import "./start-ticket.css";

// Lives here, not beside the action: a "use server" file may export only async
// functions, so the starting state cannot sit next to it.
const NO_ERROR: CreateTripFormState = { error: null };

/** Every round button on the ticket answers the keyboard the same way. */
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-terracotta";

/**
 * A stop's card, the accent's lightest tint on the ticket's paper: its name,
 * its days and the way to take it off all stand in it, 16px from its edge.
 *
 * The ticket keeps one set of corners. The ticket itself is 28px; everything
 * that stands on it is 20px, a card, the list a search hangs, the calendar;
 * a row inside one of those is 12px, 8px in from its edge; and anything
 * pressed is a pill.
 */
const CARD = "relative rounded-[20px] bg-terracotta-100";

/** The pill of the ticket's own paper a stop's days are stepped in, inside its card. */
const DAYS = "flex items-center rounded-pill bg-paper-raised";

/**
 * The way to take a stop off: a cross in the faint ink at the end of the
 * card's name, as wide as the step under it, so it stands over the step up.
 */
const REMOVE = `grid flex-none place-items-center rounded-pill text-ink-faint hover:bg-terracotta-200 hover:text-terracotta-800 ${FOCUS}`;

/**
 * A step of a stop's days, as tall as the pill it is in: a desk's. Under the
 * pointer it takes the accent's second tint, a step past the card's own, so
 * it does not read as a hole through the pill to the card.
 */
const DESK_STEP = `grid h-9 w-9 place-items-center rounded-pill text-terracotta-800 hover:bg-terracotta-200 disabled:opacity-45 disabled:hover:bg-transparent ${FOCUS}`;

/** A step of a stop's days, forty across inside the pill they share: a phone's, tinted as a desk's. */
const PHONE_STEP = `grid h-10 w-10 place-items-center rounded-pill text-terracotta-800 hover:bg-terracotta-200 disabled:opacity-45 disabled:hover:bg-transparent ${FOCUS}`;

/** A stop's name, which is pressed to change its city, warming to the accent under the pointer. */
const NAME = `rounded-chip font-display leading-[1.25] font-semibold [overflow-wrap:anywhere] text-ink hover:text-terracotta-700 ${FOCUS}`;

/**
 * A line on a desk's stub saying what opening the trip leads to. Each is one
 * row of words, so the three stand beside a single row of stops without
 * making the ticket any taller than that row already has.
 */
const AHEAD = "flex items-start gap-2.5 text-[15px] leading-[1.35] font-semibold";

/** Its glyph, level with the middle of the line's first row of words. */
const AHEAD_GLYPH = "mt-[2px] flex-none";

interface Stop {
  /** Tells two stops in one city apart, which a trip that comes back to a city has. */
  readonly key: number;
  readonly city: ChosenCity;
  readonly days: number;
}

function count(amount: number, one: string, many: string): string {
  return `${String(amount)} ${amount === 1 ? one : many}`;
}

/**
 * A stop's days as the line under its name says them, as shortly as the
 * trip's own dates are written inside it: "9 to 12 Oct", or the one day.
 */
function stay(first: IsoDate, days: number): string {
  return formatDateRange(first, addDays(first, days - 1));
}

/**
 * The front page's form, drawn as a ticket, as the start page's design draws
 * it: on its main half the stops the trip makes, each a city and how many days
 * in it, then the day it departs and the day it comes back; on its stub what
 * that comes to, on a desk what opening the trip leads to, and the button that
 * opens it.
 *
 * On a desk the two halves stand side by side, and the stops run along a line
 * with a plane between each and the next. On a phone the stub is under the
 * main half, and the stops run down a dashed line, each with its days and its
 * dates beside it.
 *
 * A stop's name is pressed to change its city: the search the next stop is
 * found with stands in its place, and the city chosen there is the stop's
 * from then on, at the same days.
 *
 * The days follow from the stops: the trip departs on the day chosen, and each
 * stop takes the days after the last one's. Nothing about the dates is typed
 * twice, and nothing can be made to disagree.
 */
export function StartTicket() {
  const [state, submit, pending] = useActionState(createTripAction, NO_ERROR);
  /**
   * Today on the reader's own clock: the day the trip departs until another
   * is chosen, and the earliest that can be. Null for the moment before the
   * browser has said, since the page is built once and served to every zone.
   */
  const today = useLocalToday();
  const [chosenStart, setChosenStart] = useState<IsoDate | null>(null);
  const start = chosenStart ?? today;
  const [stops, setStops] = useState<readonly Stop[]>([]);
  const keys = useRef(0);
  /** The ticket, which the departure calendar is kept inside from side to side. */
  const ticket = useRef<HTMLDivElement | null>(null);
  /**
   * The answer the ticket was last changed under. An answer is about the
   * ticket as it was sent, and once a stop or the date has changed it is no
   * longer that ticket: left up, the sentence would be about one that has gone.
   */
  const [changedUnder, setChangedUnder] = useState<CreateTripFormState | null>(null);
  const error = changedUnder === state ? null : state.error;
  /** The stop whose city is being changed, its name a search for now, or null. */
  const [changing, setChanging] = useState<number | null>(null);
  /**
   * The stop whose name the cursor goes back to once the search that stood
   * in its place has gone: as a city is chosen in it, or as it is left from
   * the keys. A press elsewhere has put the cursor where it wanted it.
   */
  const refocus = useRef<number | null>(null);
  useLayoutEffect(() => {
    const key = refocus.current;
    if (key === null) {
      return;
    }
    refocus.current = null;
    // Each stop is drawn twice, a desk's and a phone's, and one is on show.
    const names = ticket.current?.querySelectorAll<HTMLElement>(`[data-stop-name="${String(key)}"]`) ?? [];
    for (const name of names) {
      if (name.getClientRects().length > 0) {
        name.focus();
      }
    }
  });

  const change = (next: (now: readonly Stop[]) => readonly Stop[]): void => {
    setStops(next);
    setChangedUnder(state);
  };
  const add = (city: ChosenCity): void => {
    const key = keys.current;
    keys.current += 1;
    change((now) => [...now, { key, city, days: 1 }]);
  };
  const step = (key: number, by: number): void => {
    change((now) =>
      now.map((stop) =>
        stop.key === key
          ? { ...stop, days: Math.min(MAX_STOP_DAYS, Math.max(1, stop.days + by)) }
          : stop,
      ),
    );
  };
  const remove = (key: number): void => {
    change((now) => now.filter((stop) => stop.key !== key));
  };
  const changeCity = (key: number, city: ChosenCity): void => {
    change((now) => now.map((stop) => (stop.key === key ? { ...stop, city } : stop)));
    setChanging(null);
    refocus.current = key;
  };
  const stopChanging = (key: number, fromKeys: boolean): void => {
    setChanging(null);
    if (fromKeys) {
      refocus.current = key;
    }
  };

  /** Every city on the ticket, in the order the trip makes them. */
  const onTicket = stops.map((stop) => stop.city);

  const days = stops.reduce((total, stop) => total + stop.days, 0);
  const cities = new Set(stops.map((stop) => stop.city.providerPlaceId)).size;
  const back = start === null || days === 0 ? null : addDays(start, days - 1);
  /** The day each stop begins on, in step with the stops: each the day after the last one's end. */
  const arrives: IsoDate[] = [];
  if (start !== null) {
    let next = start;
    for (const stop of stops) {
      arrives.push(next);
      next = addDays(next, stop.days);
    }
  }

  return (
    <form action={submit} className="w-full">
      {stops.map((stop) => (
        <Fragment key={stop.key}>
          <input type="hidden" name="stopPlaceId" value={stop.city.providerPlaceId} />
          <input type="hidden" name="stopDays" value={stop.days} />
        </Fragment>
      ))}

      <div ref={ticket} className="ticket flex flex-col md:flex-row">
        {/* Over the stub, so the list of cities can hang down over it. Its
            parts 24px apart, as far over the dashed line as under it, and
            32px in from its edge on a desk, as the stub is. */}
        <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-6 px-5 py-6 md:p-8">
          <div aria-hidden="true" className="ticket-ground ticket-ground-main" />

          {/* On a desk, 44px between cards, the room a plane takes with
              12px either side of it. */}
          <ol
            aria-label="Stops"
            className="flex flex-col md:flex-row md:flex-wrap md:gap-x-11 md:gap-y-4"
          >
            {stops.map((stop, index) => {
              const { name } = stop.city;
              const first = arrives[index];
              /** The stop's own search, in its name's place while its city is being changed. */
              const search =
                changing === stop.key ? (
                  <StopSearch
                    after={stops[index - 1]?.city ?? null}
                    taken={onTicket}
                    changing={stop.city}
                    onChoose={(city) => {
                      changeCity(stop.key, city);
                    }}
                    onLeave={(fromKeys) => {
                      stopChanging(stop.key, fromKeys);
                    }}
                  />
                ) : null;
              const pressName = (): void => {
                setChanging(stop.key);
              };
              return (
                <li key={stop.key} className="md:relative md:flex">
                  {/* A phone's: on the line the stops run down, its card,
                      the city with the way to take it off at the end of
                      its line, over its dates and its days in a pill,
                      which step down to one and no further. The dot on the
                      line stands level with the name. */}
                  <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 md:hidden">
                    <div aria-hidden="true" className="flex flex-col items-center pt-[30px]">
                      <span className="h-3 w-3 flex-none rounded-pill border-[3px] border-terracotta" />
                      <span className="my-1 w-0 flex-1 border-l-2 border-dashed border-terracotta-300" />
                    </div>
                    <div className={`${CARD} mb-3 min-w-0 p-4`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {search ?? (
                            <button
                              type="button"
                              data-stop-name={stop.key}
                              aria-label={`Change ${name}`}
                              onClick={pressName}
                              className={`${NAME} text-left text-[24px]`}
                            >
                              {name}
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${name}`}
                          onClick={() => {
                            remove(stop.key);
                          }}
                          className={`${REMOVE} h-10 w-10`}
                        >
                          <CloseIcon size={14} strokeWidth={2.75} />
                        </button>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="min-w-0 text-[13px] leading-[1.2] font-medium text-ink-muted tabular-nums">
                          {first === undefined ? "" : stay(first, stop.days)}
                        </span>
                        <div className={DAYS}>
                          <button
                            type="button"
                            aria-label={`Fewer days in ${name}`}
                            disabled={stop.days <= 1}
                            onClick={() => {
                              step(stop.key, -1);
                            }}
                            className={PHONE_STEP}
                          >
                            <MinusIcon size={14} strokeWidth={2.75} />
                          </button>
                          <span className="min-w-7 text-center text-[14px] leading-none font-bold text-ink tabular-nums">
                            <span aria-hidden="true">{`${String(stop.days)}d`}</span>
                            <span className="sr-only">{count(stop.days, "day", "days")}</span>
                          </span>
                          <button
                            type="button"
                            aria-label={`More days in ${name}`}
                            disabled={stop.days >= MAX_STOP_DAYS}
                            onClick={() => {
                              step(stop.key, 1);
                            }}
                            className={PHONE_STEP}
                          >
                            <PlusIcon size={14} strokeWidth={2.75} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* A desk's: its card, at least 176px across so a row of
                      them reads as one size, and as tall as the tallest in
                      its row, the city with the way to take it off at the
                      end of its line, over its days in a pill of the
                      ticket's paper at its foot, which step down to one and
                      no further. */}
                  <div className={`${CARD} flex min-w-44 flex-col justify-between p-4 max-md:hidden`}>
                    <div className="flex items-center justify-between gap-2">
                      {/* While the city is being changed the name stays,
                          unseen, to hold the card at its width, and the
                          search lies over it, so the cards along the line
                          do not move up or down a row while it is. */}
                      <div className="relative min-w-0 flex-1">
                        <button
                          type="button"
                          data-stop-name={stop.key}
                          aria-label={`Change ${name}`}
                          onClick={pressName}
                          className={`${NAME} text-left text-[24px] ${search === null ? "" : "invisible"}`}
                        >
                          {name}
                        </button>
                        {/* Lifted over the cards after it, since being moved
                            up makes it a layer of its own, and the list it
                            hangs would otherwise go under them. */}
                        {search === null ? null : (
                          <div className="absolute inset-x-0 top-1/2 z-20 -translate-y-1/2">{search}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => {
                          remove(stop.key);
                        }}
                        className={`${REMOVE} h-9 w-9`}
                      >
                        <CloseIcon size={12} strokeWidth={2.75} />
                      </button>
                    </div>
                    <div className={`${DAYS} mt-3 justify-between`}>
                      <button
                        type="button"
                        aria-label={`Fewer days in ${name}`}
                        disabled={stop.days <= 1}
                        onClick={() => {
                          step(stop.key, -1);
                        }}
                        className={DESK_STEP}
                      >
                        <MinusIcon size={12} strokeWidth={2.75} />
                      </button>
                      <span className="min-w-14 text-center text-[14px] leading-none font-bold text-ink tabular-nums">
                        {count(stop.days, "day", "days")}
                      </span>
                      <button
                        type="button"
                        aria-label={`More days in ${name}`}
                        disabled={stop.days >= MAX_STOP_DAYS}
                        onClick={() => {
                          step(stop.key, 1);
                        }}
                        className={DESK_STEP}
                      >
                        <PlusIcon size={12} strokeWidth={2.75} />
                      </button>
                    </div>
                  </div>

                  {/* On a desk, the plane on to the next stop, in the gap
                      after this card and taking no room of its own. Where
                      the card ends a row it stands at the row's end, so the
                      leg on to the next row keeps its plane as every leg
                      does; the last stop has none. */}
                  {index === stops.length - 1 ? null : (
                    <PlaneIcon
                      size={20}
                      strokeWidth={2.75}
                      className="absolute top-1/2 left-full ml-3 -translate-y-1/2 text-terracotta max-md:hidden"
                    />
                  )}
                </li>
              );
            })}

            {/* On a desk, a line of its own under the cards and at their
                left edge, so the next stop is always found in the one place
                however many cities there are, rather than wherever the last
                card leaves room. */}
            <li className="md:basis-full">
              {stops.length < MAX_STOPS ? (
                <StopSearch after={onTicket.at(-1) ?? null} taken={onTicket} changing={null} onChoose={add} />
              ) : (
                <p className="py-2 text-[14px] leading-[1.4] font-medium text-ink-muted md:max-w-[26ch]">
                  {`A trip starts with ${String(MAX_STOPS)} stops at most. Add more from inside the trip.`}
                </p>
              )}
            </li>
          </ol>

          <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-rule pt-6 md:flex md:flex-wrap md:gap-x-10 md:gap-y-4">
            <DepartureField
              today={today}
              start={start}
              within={ticket}
              onChange={(chosen) => {
                setChosenStart(chosen);
                setChangedUnder(state);
              }}
            />
            <div className="flex flex-col gap-2">
              <span className={FIELD_LABEL}>Returns</span>
              <span className={FIELD_VALUE}>
                {back === null ? (
                  <span className="font-medium text-ink-muted">Add a stop</span>
                ) : (
                  formatDayDate(back)
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="relative isolate flex flex-col gap-4 px-5 py-6 text-sheet md:w-[260px] md:flex-none md:justify-between md:gap-6 md:p-8">
          <div aria-hidden="true" className="ticket-ground ticket-ground-stub" />
          <div className="flex flex-col gap-6">
            <p className="flex items-baseline justify-between gap-3 md:flex-col md:items-start md:gap-2">
              <span className="font-display text-[24px] leading-none font-semibold whitespace-nowrap">
                {count(days, "day", "days")}
              </span>
              <span className="text-[16px] leading-none font-semibold">
                {count(cities, "city", "cities")}
              </span>
            </p>
            {/* On a desk, once there is a stop, what opening the trip leads
                to, past a dashed line as the ticket's own: the stop's card
                has made the ticket taller than the stub's counts and button
                need, and this is the room that leaves. Before then the
                ticket is a line high and the stub has none going spare, and
                a phone's stub is a row, with none either. */}
            {stops.length === 0 ? null : (
              <ul className="flex flex-col gap-3 border-t-2 border-dashed border-sheet/50 pt-6 max-md:hidden">
                <li className={AHEAD}>
                  <ClockIcon size={16} strokeWidth={2.4} className={AHEAD_GLYPH} />
                  Real travel times
                </li>
                <li className={AHEAD}>
                  <ShareIcon size={16} strokeWidth={2.4} className={AHEAD_GLYPH} />
                  Share or print the plan
                </li>
                <li className={AHEAD}>
                  <CheckIcon size={16} strokeWidth={2.4} className={AHEAD_GLYPH} />
                  No account needed
                </li>
              </ul>
            )}
          </div>
          {/* Not open to a press until there is a stop to go to and a day to
              go on. The page is served without the day, and a ticket sent
              before the browser has said what today is would come back
              saying the date is missing, with nowhere yet to choose one. */}
          <button
            type="submit"
            disabled={pending || start === null || stops.length === 0}
            // Its ring in the stub's own light, which shows on the accent
            // where the accent's ring would not. How it moves under the
            // pointer is in start-ticket.css.
            className="ticket-go h-12 rounded-pill bg-paper-raised px-6 text-[16px] leading-none font-bold whitespace-nowrap text-terracotta-800 hover:bg-sheet active:bg-terracotta-100 disabled:opacity-45 disabled:hover:bg-paper-raised focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-sheet"
          >
            {pending ? (
              "Making the trip"
            ) : (
              <>
                Start planning{" "}
                <span aria-hidden="true" className="ticket-go-arrow">
                  →
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {error === null ? null : (
        <Notice role="alert" size="meta" className="mt-4">
          {error}
        </Notice>
      )}
    </form>
  );
}
