"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
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

/** Matches the panel's own width class, for keeping it inside the window. */
const PANEL_WIDTH = 320;

/** Room kept between the panel and the edge of the window. */
const EDGE_GAP = 16;

/** Room between the field and the panel standing beside it, the ml-4 it is drawn with. */
const SIDE_GAP = 16;

/** The most weeks a month spans: a long one that starts on a Saturday or a Sunday. */
const MOST_WEEKS = 6;

const STEP =
  "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-pill text-terracotta-700 hover:bg-terracotta-100 hover:text-terracotta-900 disabled:opacity-45 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

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
 * cannot be reached with CSS. Drawn as the calendar the trip's dates are
 * chosen on inside the planner, one month rather than two: the month under a
 * line saying what to choose, a step to the month before or after at either
 * end of it, every day a disc.
 *
 * One press chooses: the trip departs that day, and the panel goes. The days
 * the stops come to stand on a band from it to the day the trip is back, so
 * what is being chosen is seen as the whole trip, and the band follows the
 * pointer while it is over the days. Days before today are shown and not
 * offered.
 *
 * One month at a time, at every width. Where the window has room beside the
 * field it stands there, to the right of it and level with its middle,
 * rather than hanging the whole of itself under the field, where it ran the
 * page on past its end. On a phone, which has no such
 * room, it hangs under the field, centred on the whole of it, the word and
 * the day as well as the chevron, and walked back only where it would run
 * past the window's edge. Either way it stands in the room the longest month
 * takes, so its top and the arrows on it stay where they are however many
 * weeks each month stepped through has, and opening it scrolls the page as
 * little as it takes to bring all of that into the window. The arrow keys
 * walk the days, stepping the month when they walk off it, Page Up and Page
 * Down go a month, and Escape puts it away, the focus back on the field each
 * time it goes.
 */
export function DepartureField({ today, start, days, onChange }: DepartureFieldProps) {
  const [open, setOpen] = useState(false);
  /** The month on show, as its first day, and the day the keys are on, both set as it opens. */
  const [month, setMonth] = useState<IsoDate | null>(null);
  const [focused, setFocused] = useState<IsoDate | null>(null);
  /** The day under the pointer, which the band is drawn from while it is there. */
  const [previewing, setPreviewing] = useState<IsoDate | null>(null);
  /** Whether it stands beside the field, where the window has room for it there, rather than under it. */
  const [beside, setBeside] = useState(false);
  /** Where the panel's left edge goes under the field, from the field's own: centred, and kept in the window. */
  const [shift, setShift] = useState(0);
  /**
   * Set as the keys move the day, or as the panel opens, and let go of once
   * the focus has followed, so the focus is only taken when they ask for it:
   * never by the arrows over the month, which leave it where it was.
   */
  const steered = useRef(false);
  const container = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  /** Where the panel stands: the room the longest month takes. */
  const stand = useRef<HTMLDivElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);

  /**
   * Brought whole into the window as it opens, the room the longest month
   * takes with it, so a month stepped on to later is in sight however many
   * weeks it has. "nearest" leaves a calendar that is already in sight
   * exactly where it is.
   */
  useEffect(() => {
    if (open) {
      stand.current?.scrollIntoView({ block: "nearest" });
    }
  }, [open]);

  useEffect(() => {
    if (!open || !steered.current || focused === null) {
      return;
    }
    steered.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, month]);

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
      const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * EDGE_GAP);
      setBeside(box.right + SIDE_GAP + width + EDGE_GAP <= window.innerWidth);
      const centred = box.left + (box.width - width) / 2;
      setShift(Math.max(EDGE_GAP, Math.min(centred, window.innerWidth - EDGE_GAP - width)) - box.left);
    }
    setMonth(first);
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
    if (!open || start === null || today === null || month === null || focused === null) {
      return null;
    }
    const before = shiftMonths(month, -1);
    const after = shiftMonths(month, 1);
    const weeks = weeksIn(month);
    const cells = Array.from({ length: weeks * DAYS_IN_WEEK }, (_unused, index) =>
      addDays(gridStart(month), index),
    );
    const shownMonth = parseIsoDate(month).month;
    /** Nothing before today's month is offered, so there is no stepping back to it. */
    const canGoBack = month > firstOfMonth(today);
    /** The trip as it would be: from the day under the pointer, or the day chosen. */
    const leaving = previewing ?? start;
    const back = days > 1 ? addDays(leaving, days - 1) : leaving;
    /**
     * The one day Tab stops at: the day the keys are on while it is on show,
     * else the first on show that can be chosen.
     */
    const stop =
      focused >= month && focused < after
        ? focused
        : today > month && today < after
          ? today
          : month;

    /** Keeps the day the keys are on on show and never before today, stepping the month to follow it. */
    const moveTo = (date: IsoDate): void => {
      const next = date < today ? today : date;
      steered.current = true;
      setFocused(next);
      if (next < month || next >= after) {
        setMonth(firstOfMonth(next));
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
      // Where it stands: always the room the longest month takes, the panel
      // at the top of it ending at its own month's last week, so the panel's
      // top and the arrows on it never move as the months are stepped
      // through. Beside the field it is centred on the field's middle and
      // set half a week's row lower, so a month of five weeks, the
      // commonest, is the one centred exactly: a sixth week runs a row on
      // under that, and a month of four stops a row short. Presses on the
      // room the panel leaves go through to the page, as presses anywhere
      // else outside it do.
      <div
        ref={stand}
        style={beside ? undefined : { left: shift }}
        className={`pointer-events-none absolute z-20 ${beside ? "top-1/2 left-full mt-[18px] ml-4 -translate-y-1/2" : "top-full mt-3"}`}
      >
        <div
          role="dialog"
          aria-label="Choose the day the trip departs"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              putAway();
            }
          }}
          className="pointer-events-auto w-[min(320px,calc(100vw-2rem))] rounded-card border border-rule bg-paper-raised px-5 pt-4 pb-3 shadow-md"
        >
          {/* The line over the month: what to choose, and a step of one month
              at either end of it, each named for the month it goes to. */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(before))}`}
              disabled={!canGoBack}
              onClick={() => {
                setMonth(before);
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
                setMonth(after);
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
            className="mt-4"
          >
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
              {Array.from({ length: weeks }, (_unused, week) => (
                <div role="row" key={week} className="grid grid-cols-7">
                  {cells.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK).map((date) => {
                    if (parseIsoDate(date).month !== shownMonth) {
                      return <span role="gridcell" key={date} className="h-9" />;
                    }
                    const early = date < today;
                    const isStart = date === leaving;
                    const isBack = date === back && back > leaving;
                    /*
                     * The trip's days stand on a band from the day it departs
                     * to the day it is back, rounded off at each end, in the
                     * tint the planner's calendar draws a range in.
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
        </div>

        {/* Out of sight under the panel, the weeks its month does not have.
            Under the field, the room kept from the window's foot as well:
            the page ends where the last thing on it does, and needs that
            room to scroll to. */}
        <div aria-hidden="true">
          {Array.from({ length: MOST_WEEKS - weeks }, (_unused, at) => (
            <div key={`room-${String(at)}`} className="h-9" />
          ))}
          {beside ? null : <div className="h-4" />}
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
