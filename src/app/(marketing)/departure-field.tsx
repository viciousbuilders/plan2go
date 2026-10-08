"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { IsoDate } from "@/core/model/day";
import { addDays, isoDateAsUtc, parseIsoDate } from "@/core/time/zoned";
import { formatDayDate } from "@/features/day-planner/format-day-date";
import {
  DAYS_IN_WEEK,
  MONTH_AND_YEAR,
  READABLE,
  WEEKDAYS,
  firstOfMonth,
  gridStart,
  sameDayIn,
  shiftMonths,
  weeksIn,
} from "@/features/trip-settings/month-grid";
import { ArrowLeftIcon, ArrowRightIcon, ChevronDownIcon } from "@/ui/icons";
import { useOutsidePress } from "@/ui/use-outside-press";
import { FIELD_LABEL, FIELD_VALUE } from "./ticket-type";

/** The day the trip departs as a desk's ticket writes it, the year included. */
const DEPARTS_ON = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Room for two months side by side: Tailwind's sm. Under it, one. */
const ROOM_FOR_TWO = "(min-width: 40rem)";

/** Each matches the panel's own width class, for keeping it inside the window. */
const ONE_MONTH_WIDTH = 320;
const TWO_MONTHS_WIDTH = 600;

/** Room kept between the panel and the edge of the window, and between it and the field. */
const EDGE_GAP = 16;
const FIELD_GAP = 12;

/**
 * How tall the panel comes to, for deciding whether it fits under the field:
 * its padding, the line with the arrows, the month's name and the weekdays,
 * and then a row for each week.
 */
const PANEL_FRAME_HEIGHT = 140;
const WEEK_HEIGHT = 36;

const STEP =
  "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-pill text-terracotta-700 hover:bg-terracotta-100 hover:text-terracotta-900 disabled:opacity-45 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

function watchWidth(onChange: () => void): () => void {
  const room = window.matchMedia(ROOM_FOR_TWO);
  room.addEventListener("change", onChange);
  return () => {
    room.removeEventListener("change", onChange);
  };
}

interface DepartureFieldProps {
  /** Today on the reader's own clock, the earliest day a trip can depart, or null until the browser has said. */
  readonly today: IsoDate | null;
  /** The day the trip departs, or null until the browser has said what today is. */
  readonly start: IsoDate | null;
  /** How many days the stops come to, for drawing the whole trip from the day it departs. */
  readonly days: number;
  readonly onChange: (start: IsoDate) => void;
}

/**
 * The day the trip departs, chosen from a calendar of the product's own rather
 * than the browser's, which is drawn by the browser in a system's colours and
 * cannot be reached with CSS. The same calendar the trip's dates are chosen on
 * inside the planner: the months under a line saying what to choose, a step to
 * the month before or after at either end of it, every day a disc.
 *
 * One press chooses: the trip departs that day, and the panel goes. The days
 * the stops come to stand on a band from it to the day the trip is back, so
 * what is being chosen is seen as the whole trip, and the band follows the
 * pointer while it is over the days. Days before today are shown and not
 * offered.
 *
 * Two months side by side where there is room, one on a phone. It opens under
 * the field, or over it when the window has no room under it, and is walked
 * back from the window's edge. The arrow keys walk the days, stepping the
 * months when they walk off them, Page Up and Page Down go a month, and Escape
 * puts it away, the focus back on the field each time it goes.
 */
export function DepartureField({ today, start, days, onChange }: DepartureFieldProps) {
  const [open, setOpen] = useState(false);
  /** The first of the months on show, and the day the keys are on, both set as it opens. */
  const [leftMonth, setLeftMonth] = useState<IsoDate | null>(null);
  const [focused, setFocused] = useState<IsoDate | null>(null);
  /** The day under the pointer, which the band is drawn from while it is there. */
  const [previewing, setPreviewing] = useState<IsoDate | null>(null);
  /** Where the panel's left edge goes, from the field's own, to keep it in the window. */
  const [shift, setShift] = useState(0);
  /** Whether it opens over the field, when the window has no room under it. */
  const [above, setAbove] = useState(false);
  /**
   * Set as the keys move the day, or as the panel opens, and let go of once
   * the focus has followed, so the focus is only taken when they ask for it:
   * never by the arrows over the months, which leave it where it was.
   */
  const steered = useRef(false);
  const container = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);
  const two = useSyncExternalStore(
    watchWidth,
    () => window.matchMedia(ROOM_FOR_TWO).matches,
    () => true,
  );
  const shown = two ? 2 : 1;

  useEffect(() => {
    if (!open || !steered.current || focused === null) {
      return;
    }
    steered.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, leftMonth]);

  useOutsidePress(container, open, () => {
    setOpen(false);
  });

  const putAway = (): void => {
    setOpen(false);
    trigger.current?.focus();
  };

  const openPanel = (): void => {
    if (start === null) {
      return;
    }
    const first = firstOfMonth(start);
    const box = trigger.current?.getBoundingClientRect();
    if (box !== undefined) {
      const width = Math.min(two ? TWO_MONTHS_WIDTH : ONE_MONTH_WIDTH, window.innerWidth - 2 * EDGE_GAP);
      setShift(Math.max(EDGE_GAP, Math.min(box.left, window.innerWidth - EDGE_GAP - width)) - box.left);
      const weeks = Math.max(...Array.from({ length: shown }, (_unused, at) => weeksIn(shiftMonths(first, at))));
      const height = PANEL_FRAME_HEIGHT + weeks * WEEK_HEIGHT;
      const roomUnder = window.innerHeight - box.bottom - FIELD_GAP - EDGE_GAP;
      const roomOver = box.top - FIELD_GAP - EDGE_GAP;
      setAbove(roomUnder < height && roomOver >= height);
    }
    setLeftMonth(first);
    setFocused(start);
    setPreviewing(null);
    steered.current = true;
    setOpen(true);
  };

  const pick = (date: IsoDate): void => {
    onChange(date);
    putAway();
  };

  const panel = (() => {
    if (!open || start === null || today === null || leftMonth === null || focused === null) {
      return null;
    }
    const months = Array.from({ length: shown }, (_unused, at) => shiftMonths(leftMonth, at));
    const afterShown = shiftMonths(leftMonth, shown);
    /** As many rows as the taller month needs, both drawn to it so their weeks line up. */
    const weeksShown = Math.max(...months.map(weeksIn));
    const before = shiftMonths(leftMonth, -1);
    const after = shiftMonths(leftMonth, shown);
    /** Nothing before today's month is offered, so there is no stepping back to it. */
    const canGoBack = leftMonth > firstOfMonth(today);
    /** The trip as it would be: from the day under the pointer, or the day chosen. */
    const leaving = previewing ?? start;
    const back = days > 1 ? addDays(leaving, days - 1) : leaving;
    /**
     * The one day Tab stops at: the day the keys are on while it is on show,
     * else the first on show that can be chosen.
     */
    const stop =
      focused >= leftMonth && focused < afterShown
        ? focused
        : today > leftMonth && today < afterShown
          ? today
          : leftMonth;

    /** Keeps the day the keys are on on show and never before today, stepping the months to follow it. */
    const moveTo = (date: IsoDate): void => {
      const next = date < today ? today : date;
      steered.current = true;
      setFocused(next);
      if (next < leftMonth) {
        setLeftMonth(firstOfMonth(next));
      } else if (next >= afterShown) {
        setLeftMonth(shiftMonths(firstOfMonth(next), -(shown - 1)));
      }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
      const steps: Readonly<Record<string, number>> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -DAYS_IN_WEEK,
        ArrowDown: DAYS_IN_WEEK,
      };
      const step = steps[event.key];
      if (step !== undefined) {
        event.preventDefault();
        moveTo(addDays(stop, step));
        return;
      }
      if (event.key === "PageUp" || event.key === "PageDown") {
        event.preventDefault();
        moveTo(sameDayIn(stop, event.key === "PageUp" ? -1 : 1));
      }
    };

    return (
      <div
        role="dialog"
        aria-label="Choose the day the trip departs"
        style={{ left: shift }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            putAway();
          }
        }}
        className={`absolute z-20 rounded-card border border-rule bg-paper-raised px-5 pt-4 pb-3 shadow-md ${
          two ? "w-[min(600px,calc(100vw-2rem))]" : "w-[min(320px,calc(100vw-2rem))]"
        } ${above ? "bottom-full mb-3" : "top-full mt-3"}`}
      >
        {/* The line over the months: what to choose, and a step of one month
            at either end of it, each named for the month it goes to. */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(before))}`}
            disabled={!canGoBack}
            onClick={() => {
              setLeftMonth(before);
            }}
            className={STEP}
          >
            <ArrowLeftIcon size={20} strokeWidth={1.75} />
          </button>
          <p className="text-center text-body/none font-medium text-ink-muted">
            Choose the day you depart
          </p>
          <button
            type="button"
            aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(after))}`}
            onClick={() => {
              setLeftMonth(shiftMonths(leftMonth, 1));
            }}
            className={STEP}
          >
            <ArrowRightIcon size={20} strokeWidth={1.75} />
          </button>
        </div>

        <div
          ref={grid}
          onKeyDown={onKeyDown}
          onMouseLeave={() => {
            setPreviewing(null);
          }}
          className={`mt-4 grid gap-x-6 gap-y-5 ${two ? "grid-cols-2" : ""}`}
        >
          {months.map((month) => {
            const cells = Array.from({ length: weeksShown * DAYS_IN_WEEK }, (_unused, index) =>
              addDays(gridStart(month), index),
            );
            const shownMonth = parseIsoDate(month).month;
            return (
              <div key={month}>
                <p className="text-center font-display text-place/none font-bold text-ink">
                  {MONTH_AND_YEAR.format(isoDateAsUtc(month))}
                </p>
                <div role="grid" aria-label={MONTH_AND_YEAR.format(isoDateAsUtc(month))} className="mt-3">
                  <div role="row" className="grid grid-cols-7">
                    {WEEKDAYS.map((weekday, index) => (
                      <span
                        key={index}
                        role="columnheader"
                        className="pb-1.5 text-center text-meta/none text-ink-muted"
                      >
                        <span aria-hidden="true">{weekday.short}</span>
                        <span className="sr-only">{weekday.full}</span>
                      </span>
                    ))}
                  </div>
                  {Array.from({ length: weeksShown }, (_unused, week) => (
                    <div role="row" key={week} className="grid grid-cols-7">
                      {cells.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK).map((date) => {
                        if (parseIsoDate(date).month !== shownMonth) {
                          return <span role="gridcell" key={date} className="h-9" />;
                        }
                        const early = date < today;
                        const isStart = date === leaving;
                        const isBack = date === back && back > leaving;
                        /*
                         * The trip's days stand on a band from the day it
                         * departs to the day it is back, rounded off at each
                         * end, in the tint the planner's calendar draws a
                         * range in.
                         */
                        const banded = back > leaving && date >= leaving && date <= back;
                        return (
                          <span
                            role="gridcell"
                            key={date}
                            aria-selected={date === start}
                            className={[
                              "grid h-9 place-items-center",
                              banded ? "bg-terracotta-200/70" : "",
                              banded && isStart ? "rounded-l-pill" : "",
                              banded && isBack ? "rounded-r-pill" : "",
                            ].join(" ")}
                          >
                            <button
                              type="button"
                              data-date={date}
                              disabled={early}
                              tabIndex={date === stop ? 0 : -1}
                              aria-current={date === today ? "date" : undefined}
                              onClick={() => {
                                pick(date);
                              }}
                              onMouseEnter={() => {
                                setPreviewing(early ? null : date);
                              }}
                              // The day it departs filled in the accent's deepest
                              // brown, as a chosen day is anywhere in the product,
                              // and the day it is back ringed in it, since that
                              // follows from the stops rather than being chosen.
                              className={[
                                "grid h-8 w-8 place-items-center rounded-pill border font-display text-body/none font-bold tabular-nums focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta",
                                isStart
                                  ? "border-terracotta-800 bg-terracotta-800 text-paper"
                                  : isBack
                                    ? "border-terracotta-800 text-terracotta-800"
                                    : early
                                      ? "border-transparent text-ink-faint"
                                      : date === today
                                        ? "border-terracotta text-ink hover:bg-terracotta-200"
                                        : "border-transparent text-ink hover:bg-terracotta-200",
                              ].join(" ")}
                            >
                              <span aria-hidden="true">{parseIsoDate(date).day}</span>
                              <span className="sr-only">
                                {READABLE.format(isoDateAsUtc(date))}
                                {date === today ? ", today" : ""}
                                {isBack ? ", the day the trip is back" : ""}
                              </span>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  })();

  return (
    <div ref={container} className="relative">
      <input type="hidden" name="startDate" value={start ?? ""} />
      <button
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        // Not open to a press until the browser has said what today is: there
        // is no month to show before then.
        disabled={start === null}
        onClick={() => {
          if (open) {
            putAway();
          } else {
            openPanel();
          }
        }}
        className="flex min-h-11 flex-col items-start gap-2 rounded-chip text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta"
      >
        <span className={FIELD_LABEL}>Departs</span>
        <span className={`${FIELD_VALUE} flex items-center gap-[6px] md:gap-2`}>
          {start === null ? (
            // The day's room, kept blank until the browser has said what
            // today is, so nothing moves when it arrives.
            <span className="invisible">Thu, 8 Oct</span>
          ) : (
            <>
              <span className="md:hidden">{formatDayDate(start)}</span>
              <span className="max-md:hidden">{DEPARTS_ON.format(isoDateAsUtc(start))}</span>
            </>
          )}
          <ChevronDownIcon
            size={15}
            strokeWidth={2.75}
            className={`flex-none text-terracotta-700 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {panel}
    </div>
  );
}
