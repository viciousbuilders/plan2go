"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import type { IsoDate } from "@/core/model/day";
import { addDays, isoDateAsUtc, parseIsoDate } from "@/core/time/zoned";
import { ChevronLeftIcon, ChevronRightIcon } from "@/ui/icons";
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
} from "./month-grid";

/** The trip's two ends as they are drawn: the last is null between the two presses. */
export interface DrawnRange {
  readonly start: IsoDate;
  readonly end: IsoDate | null;
}

interface MonthCalendarProps {
  /** What the days are for, at the head of the row the month is stepped on. */
  readonly label: string;
  readonly range: DrawnRange;
  readonly onChange: (range: DrawnRange) => void;
}

/** A step to the month before or after, either side of its name: forty across, a finger's size. */
const STEP =
  "grid h-10 w-10 shrink-0 place-items-center rounded-pill text-ink hover:bg-paper-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

/**
 * The trip's dates as a phone chooses them on Edit trip's page, the way
 * design 1b draws the start of a trip: one month at a time, stepped by the
 * arrows either side of its name on the row the label heads, and under that
 * row the month on raised paper inside a 1.5px hairline, the edge the name's
 * field has, since the sheet it is drawn on is raised paper too. A week to a
 * row, Monday first, every day a disc forty across in a cell forty two tall.
 *
 * Two presses draw the trip: the first sets where it begins and leaves the
 * end open, the second where it ends. A press before the first day, or once
 * both ends are set, begins again there, which is what somebody who has
 * changed their mind is doing anyway. The two ends are filled in the accent's
 * deepest brown with their day in paper, and the days from one to the other
 * stand on a band of the accent's lightest tint, rounded off where it stops.
 * A line over the month, outside its card, says which of the two presses
 * comes next, as it does over a desk's months.
 *
 * The arrow keys walk the days, stepping the month when they walk off it, and
 * Page Up and Page Down step the month, taking the day to the same date in it.
 * The focus follows the keys and nothing else: stepping the month by its
 * arrows leaves it on the arrow.
 */
export function MonthCalendar({ label, range, onChange }: MonthCalendarProps) {
  const labelId = useId();
  /** The first of the month on show. */
  const [month, setMonth] = useState<IsoDate>(firstOfMonth(range.start));
  /** The day the keys are on. */
  const [focused, setFocused] = useState<IsoDate>(range.start);
  /**
   * Set as a key moves the day and let go of once the focus has followed it,
   * so the focus is only taken when the keys ask for it, and never by the
   * arrows either side of the month's name coming back to the day.
   */
  const steered = useRef(false);
  const grid = useRef<HTMLDivElement | null>(null);

  const shown = parseIsoDate(month).month;
  /** The one day Tab stops at: the day the keys are on while it is on show, else the month's first. */
  const stop = firstOfMonth(focused) === month ? focused : month;

  useEffect(() => {
    if (!steered.current) {
      return;
    }
    steered.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, month]);

  const pick = (date: IsoDate): void => {
    setFocused(date);
    if (range.end !== null || date < range.start) {
      onChange({ start: date, end: null });
      return;
    }
    onChange({ start: range.start, end: date });
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
      const next = addDays(stop, step);
      steered.current = true;
      setFocused(next);
      setMonth(firstOfMonth(next));
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      // The day goes with the month, or the focus would be left on a day
      // that has gone from the grid.
      const next = sameDayIn(stop, event.key === "PageUp" ? -1 : 1);
      steered.current = true;
      setFocused(next);
      setMonth(firstOfMonth(next));
    }
  };

  const before = shiftMonths(month, -1);
  const after = shiftMonths(month, 1);
  const weeks = weeksIn(month);
  const cells = Array.from({ length: weeks * DAYS_IN_WEEK }, (_unused, index) =>
    addDays(gridStart(month), index),
  );
  const { start, end } = range;

  return (
    <div>
      <div className="flex items-center">
        <span id={labelId} className="flex-1 text-small/none font-bold text-ink">
          {label}
        </span>
        <button
          type="button"
          aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(before))}`}
          onClick={() => {
            setMonth(before);
          }}
          className={STEP}
        >
          <ChevronLeftIcon size={18} strokeWidth={2.75} />
        </button>
        <p aria-live="polite" className="min-w-[110px] text-center text-body/none font-bold text-ink">
          {MONTH_AND_YEAR.format(isoDateAsUtc(month))}
        </p>
        <button
          type="button"
          aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(after))}`}
          onClick={() => {
            setMonth(after);
          }}
          className={STEP}
        >
          <ChevronRightIcon size={18} strokeWidth={2.75} />
        </button>
      </div>

      {/* Which press comes next, in the words a desk's calendar uses over
          its months, between the row the month is stepped on and the
          month itself. Not read out as it changes, since the line under the
          month on Edit trip's page already is. */}
      <p className="mt-[10px] text-center text-body/none font-medium text-ink-muted">
        {end === null ? "Now choose the last day" : "Choose the first day"}
      </p>

      <div
        ref={grid}
        role="grid"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="mt-[10px] rounded-card border-[1.5px] border-rule bg-paper-raised px-2 py-3"
      >
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((weekday, index) => (
            <span
              key={index}
              role="columnheader"
              className="pt-1 pb-2 text-center text-micro/none font-semibold text-ink-faint"
            >
              <span aria-hidden="true">{weekday.short}</span>
              <span className="sr-only">{weekday.full}</span>
            </span>
          ))}
        </div>

        {Array.from({ length: weeks }, (_unused, week) => (
          <div role="row" key={week} className="mt-1 grid grid-cols-7">
            {cells.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK).map((date) => {
              if (parseIsoDate(date).month !== shown) {
                return <span role="gridcell" key={date} />;
              }
              const isEnd = date === start || date === end;
              const banded = end !== null && end > start && date >= start && date <= end;
              return (
                <span
                  role="gridcell"
                  key={date}
                  aria-selected={isEnd}
                  className={[
                    "grid h-[42px] place-items-center",
                    banded ? "bg-terracotta-100" : "",
                    banded && date === start ? "rounded-l-pill" : "",
                    banded && date === end ? "rounded-r-pill" : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={date === stop ? 0 : -1}
                    onClick={() => {
                      pick(date);
                    }}
                    className={`grid h-10 w-10 place-items-center rounded-pill text-body/none font-bold tabular-nums focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta ${
                      isEnd ? "bg-terracotta-800 text-paper" : "text-ink hover:bg-terracotta-100"
                    }`}
                  >
                    <span aria-hidden="true">{parseIsoDate(date).day}</span>
                    <span className="sr-only">{READABLE.format(isoDateAsUtc(date))}</span>
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
