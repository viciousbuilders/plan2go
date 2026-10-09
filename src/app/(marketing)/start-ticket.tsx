"use client";

import { Fragment, useActionState, useRef, useState } from "react";
import type { IsoDate } from "@/core/model/day";
import { MAX_STOP_DAYS, MAX_STOPS } from "@/core/model/trip";
import { addDays } from "@/core/time/zoned";
import { formatDayDate } from "@/features/day-planner/format-day-date";
import { CloseIcon, MinusIcon, PlaneIcon, PlusIcon } from "@/ui/icons";
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

/** A step of a stop's days, on its own disc of the accent's lightest tint: a desk's. */
const DESK_STEP = `grid h-7 w-7 place-items-center rounded-pill bg-terracotta-100 text-terracotta-800 hover:bg-terracotta-200 disabled:opacity-45 disabled:hover:bg-terracotta-100 ${FOCUS}`;

/** A step of a stop's days, forty across inside the pill they share: a phone's. */
const PHONE_STEP = `grid h-10 w-10 place-items-center rounded-pill text-terracotta-800 hover:bg-terracotta-200 disabled:opacity-45 disabled:hover:bg-transparent ${FOCUS}`;

interface Stop {
  /** Tells two stops in one city apart, which a trip that comes back to a city has. */
  readonly key: number;
  readonly city: ChosenCity;
  readonly days: number;
}

function count(amount: number, one: string, many: string): string {
  return `${String(amount)} ${amount === 1 ? one : many}`;
}

/** A stop's days as the line under its name says them: the day, or the first and last. */
function stay(first: IsoDate, days: number): string {
  return days === 1
    ? formatDayDate(first)
    : `${formatDayDate(first)} to ${formatDayDate(addDays(first, days - 1))}`;
}

/**
 * The front page's form, drawn as a ticket, as the start page's design draws
 * it: on its main half the stops the trip makes, each a city and how many days
 * in it, then the day it departs and the day it comes back; on its stub what
 * that comes to and the button that opens the trip.
 *
 * On a desk the two halves stand side by side, and the stops run along a line
 * with a plane between each and the next. On a phone the stub is under the
 * main half, and the stops run down a dashed line, each with its days and its
 * dates beside it.
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
        {/* Over the stub, so the list of cities can hang down over it. */}
        <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-5 px-5 py-6 md:gap-6 md:p-8">
          <div aria-hidden="true" className="ticket-ground ticket-ground-main" />

          <ol
            aria-label="Stops"
            className="flex flex-col md:flex-row md:flex-wrap md:items-start md:gap-x-3 md:gap-y-4"
          >
            {stops.map((stop, index) => {
              const { name } = stop.city;
              const first = arrives[index];
              return (
                <li key={stop.key} className="md:flex md:items-start md:gap-3">
                  {/* A phone's: on the line the stops run down, the city
                      and its dates, and its days in a pill at the end. At
                      one day the step down takes the stop off instead. */}
                  <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] gap-x-3 md:hidden">
                    <div aria-hidden="true" className="flex flex-col items-center pt-[10px]">
                      <span className="h-3 w-3 flex-none rounded-pill border-[3px] border-terracotta" />
                      <span className="my-1 w-0 flex-1 border-l-2 border-dashed border-terracotta-300" />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 pb-4">
                      <span className="font-display text-[25px] leading-[1.25] font-semibold [overflow-wrap:anywhere] text-ink">
                        {name}
                      </span>
                      <span className="text-[13px] leading-[1.2] font-medium text-ink-muted tabular-nums">
                        {first === undefined ? "" : stay(first, stop.days)}
                      </span>
                    </div>
                    <div className="flex items-center self-start rounded-pill bg-terracotta-100">
                      <button
                        type="button"
                        aria-label={stop.days > 1 ? `Fewer days in ${name}` : `Remove ${name}`}
                        onClick={() => {
                          if (stop.days > 1) {
                            step(stop.key, -1);
                          } else {
                            remove(stop.key);
                          }
                        }}
                        className={PHONE_STEP}
                      >
                        {stop.days > 1 ? (
                          <MinusIcon size={14} strokeWidth={2.75} />
                        ) : (
                          <CloseIcon size={14} strokeWidth={2.75} />
                        )}
                      </button>
                      <span className="min-w-7 text-center text-[14px] leading-none font-bold text-terracotta-800 tabular-nums">
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

                  {/* A desk's: the city over its days, which step down to
                      one and no further, and the way to take it off, the
                      two centred on each other whichever is the wider; then
                      the plane on to the next. */}
                  <div className="flex min-w-0 flex-col items-center gap-2 max-md:hidden">
                    <span className="text-center font-display text-[30px] leading-[1.25] font-semibold [overflow-wrap:anywhere] text-ink">
                      {name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Fewer days in ${name}`}
                        disabled={stop.days <= 1}
                        onClick={() => {
                          step(stop.key, -1);
                        }}
                        className={DESK_STEP}
                      >
                        <MinusIcon size={13} strokeWidth={2.75} />
                      </button>
                      <span className="min-w-14 text-center text-[14px] leading-none font-semibold text-ink-muted tabular-nums">
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
                        <PlusIcon size={13} strokeWidth={2.75} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${name}`}
                        onClick={() => {
                          remove(stop.key);
                        }}
                        className={`grid h-7 w-7 place-items-center rounded-pill text-ink-faint hover:bg-terracotta-100 hover:text-terracotta-800 ${FOCUS}`}
                      >
                        <CloseIcon size={13} strokeWidth={2.75} />
                      </button>
                    </div>
                  </div>
                  <PlaneIcon
                    size={24}
                    strokeWidth={2.75}
                    className="mt-2 flex-none text-terracotta max-md:hidden"
                  />
                </li>
              );
            })}

            {/* On a desk, as tall as a stop: the name's line, 30px at 1.25,
                over its days, 8px under it and 28px tall. So the row the
                field is on keeps its height when the city chosen in it
                takes the field's place. */}
            <li className="md:min-h-[73.5px]">
              {stops.length < MAX_STOPS ? (
                <StopSearch first={stops.length === 0} onAdd={add} />
              ) : (
                <p className="py-2 text-[14px] leading-[1.4] font-medium text-ink-muted md:max-w-[26ch]">
                  {`A trip starts with ${String(MAX_STOPS)} stops at most. Add more from inside the trip.`}
                </p>
              )}
            </li>
          </ol>

          <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-rule pt-[18px] md:flex md:flex-wrap md:gap-x-10 md:gap-y-4 md:pt-5">
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

        <div className="relative isolate flex flex-col gap-4 px-5 pt-[22px] pb-5 text-sheet md:w-[260px] md:flex-none md:justify-between md:gap-6 md:px-7 md:py-8">
          <div aria-hidden="true" className="ticket-ground ticket-ground-stub" />
          <p className="flex items-baseline justify-between gap-3 md:flex-col md:items-start md:gap-2">
            <span className="font-display text-[27px] leading-none font-semibold whitespace-nowrap md:text-[30px]">
              {count(days, "day", "days")}
            </span>
            <span className="text-[15px] leading-none font-semibold">
              {count(cities, "city", "cities")}
            </span>
          </p>
          {/* Not open to a press until there is a stop to go to and a day to
              go on. The page is served without the day, and a ticket sent
              before the browser has said what today is would come back
              saying the date is missing, with nowhere yet to choose one. */}
          <button
            type="submit"
            disabled={pending || start === null || stops.length === 0}
            // Its ring in the stub's own light, which shows on the accent
            // where the accent's ring would not.
            className="h-[52px] rounded-pill bg-paper-raised px-6 text-[16px] leading-none font-bold whitespace-nowrap text-terracotta-800 hover:bg-sheet active:bg-terracotta-100 disabled:opacity-45 disabled:hover:bg-paper-raised focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-sheet md:h-auto md:py-4"
          >
            {pending ? (
              "Making the trip"
            ) : (
              <>
                Start planning <span aria-hidden="true">→</span>
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
