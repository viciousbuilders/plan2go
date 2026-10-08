"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { IsoDate } from "@/core/model/day";
import { addDays, isoDateAsUtc, parseIsoDate } from "@/core/time/zoned";
import { ArrowLeftIcon, ArrowRightIcon } from "@/ui/icons";
import { useOutsidePress } from "@/ui/use-outside-press";
import { formatDateRange } from "@/core/time/date-range";
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

/** Two at once, so a trip that crosses the end of a month is one gesture. */
const MONTHS_SHOWN = 2;

/** Matches the panel's own width class, for the edge test when it opens. */
const PANEL_WIDTH = 600;

/** Room to keep between the panel and the edge of the window. Matches the 2rem in its width class. */
const EDGE_GAP = 16;

/**
 * On the trip's own name row, one control among several on a 34px line: no
 * label and no box. The dates sit beside the trip's name as a fact about it,
 * and a row that reads "Hanoi, five days 10 to 15 Sept Change" spends its last
 * word on the mechanism rather than on the trip, so the word that opens it is
 * not shown. It is still there for anybody who cannot see the pill light up
 * under the pointer.
 *
 * Not on a phone, where the dates are written under the trip's name and set
 * on Edit trip's page, from the trip's menu, on a calendar of its own.
 */
const TRIGGER =
  "flex w-full items-center rounded-pill border border-transparent bg-transparent px-2 py-[5px] text-left text-small/none font-semibold text-ink-muted hover:bg-terracotta-100 hover:text-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

const STEP =
  "grid h-[30px] w-[30px] shrink-0 place-items-center rounded-pill text-terracotta-700 hover:bg-terracotta-100 hover:text-terracotta-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

interface DateRangeFieldProps {
  readonly id: string;
  /** Submitted with the form. The visible control is a button, not these. */
  readonly startName: string;
  readonly endName: string;
  readonly label: string;
  readonly start: IsoDate;
  readonly end: IsoDate;
  /**
   * The day that gets the ring: today on the reader's own clock, or null
   * while the browser has not yet said, when no day is ringed. Read off the
   * browser's clock in UTC, as it once was, this was yesterday every morning
   * in Adelaide; it is read in the browser's own zone now, the same way the
   * day tabs read it, so the two always agree.
   */
  readonly today: IsoDate | null;
  /** The longest a trip may run, counting both ends. */
  readonly maxSpanDays?: number;
  readonly onChange: (range: { start: IsoDate; end: IsoDate }) => void;
  /** Sits under the months, inside the panel. Where the save button lives. */
  readonly footer?: ReactNode;
  /**
   * Called whenever the panel closes. Choosing days does not commit anything,
   * so this is the caller's chance to put back what was there.
   */
  readonly onClose?: () => void;
}

/**
 * Both ends of a trip, chosen from one calendar.
 *
 * Two months at once, and the two ends picked in one gesture: the first click
 * sets where the trip begins, the second where it ends, and the days between
 * fill in as the pointer moves. Two separate fields asked the same question
 * twice and made the answers argue, because each had to be bounded by the other
 * and neither could be moved past it. A range has no such problem: clicking
 * before the day already chosen simply starts again there, which is what
 * somebody who has changed their mind is doing anyway.
 *
 * The line over the months says which of the two clicks comes next, and the
 * field above follows the calendar as it is drawn on, so the first click is
 * seen to land before the second is asked for.
 *
 * The browser's own date picker is drawn by the browser and cannot be reached
 * with CSS, so on a page meant to read like a printed guide it arrives as a
 * blue system panel. This is the same control in the palette from DESIGN.md.
 *
 * The months are stepped by the arrows at either end of that line rather than
 * by buttons naming the month they go to, which is what a calendar of two
 * months has room for. Each carries the month it moves to as its label, so
 * nothing here is an icon on its own.
 */
export function DateRangeField({
  id,
  startName,
  endName,
  label,
  start,
  end,
  today,
  maxSpanDays,
  onChange,
  footer,
  onClose,
}: DateRangeFieldProps) {
  const [open, setOpen] = useState(false);
  /** The left of the two months on show. */
  const [leftMonth, setLeftMonth] = useState<IsoDate>(firstOfMonth(start));
  /**
   * Where a range being drawn began, or null when the one on show is settled.
   * While this is set the panel is answering "and when do you come back".
   */
  const [drawingFrom, setDrawingFrom] = useState<IsoDate | null>(null);
  /** What the pointer is over, so the days between fill in before the click. */
  const [previewing, setPreviewing] = useState<IsoDate | null>(null);
  const [focused, setFocused] = useState<IsoDate>(start);
  /**
   * Where the panel's left edge goes, in pixels from the field's own. The
   * panel is centred on the field, which it is much wider than, so its middle
   * rather than either edge
   * is what it shares with the thing that opened it. Centred like that it can
   * open off the side of the window, so it is walked back until it fits, and
   * on a window narrower than the panel that means the window's own margin
   * rather than anything about the field.
   */
  const [shift, setShift] = useState(0);

  const container = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);
  /** Read by the dismiss listener, which outlives the render that set it up. */
  const closing = useRef(onClose);
  useEffect(() => {
    closing.current = onClose;
  });

  // The roving focus follows the arrow keys, so the focused cell has to be the
  // one the browser is actually on.
  useEffect(() => {
    if (!open) {
      return;
    }
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused]);

  useOutsidePress(container, open, () => {
    setOpen(false);
    setDrawingFrom(null);
    closing.current?.();
  });

  const months = Array.from({ length: MONTHS_SHOWN }, (_unused, at) =>
    shiftMonths(leftMonth, at),
  );
  const afterShown = shiftMonths(leftMonth, MONTHS_SHOWN);
  /**
   * As many rows as the taller of the two months needs. Both are drawn to the
   * same count so their weeks line up, and no more, so nothing hangs empty
   * under a pair that fits in five.
   */
  const weeksShown = Math.max(...months.map(weeksIn));

  /**
   * What the grid paints, and what the field above reads while it is open.
   * While a range is being drawn that is the day it began on and wherever the
   * pointer has reached; otherwise it is the trip as it stands.
   */
  const shownStart = drawingFrom ?? start;
  const shownEnd =
    drawingFrom === null
      ? end
      : previewing !== null && previewing > drawingFrom
        ? previewing
        : drawingFrom;

  /** While drawing, no day past the longest a trip may run is offered. */
  const furthest =
    drawingFrom === null || maxSpanDays === undefined
      ? undefined
      : addDays(drawingFrom, maxSpanDays - 1);

  /**
   * The one day Tab stops at: the day the keys are on while it is on show and
   * may be chosen, else the first on show that may. The arrows over the months
   * step them without the keys, and a grid with no day to stop at is one Tab
   * walks straight past. Null when nothing on show may be chosen.
   */
  const stop = ((): IsoDate | null => {
    const offered = (date: IsoDate): boolean => furthest === undefined || date <= furthest;
    if (focused >= leftMonth && focused < afterShown && offered(focused)) {
      return focused;
    }
    return offered(leftMonth) ? leftMonth : null;
  })();

  const close = (): void => {
    setOpen(false);
    setDrawingFrom(null);
    onClose?.();
    trigger.current?.focus();
  };

  const choose = (date: IsoDate): void => {
    if (drawingFrom === null || date < drawingFrom) {
      // Nothing drawn yet, or a click before where this one began, which is
      // somebody starting again rather than choosing an end before a start.
      setDrawingFrom(date);
      setPreviewing(null);
      return;
    }
    onChange({ start: drawingFrom, end: date });
    setDrawingFrom(null);
    setPreviewing(null);
  };

  /** Keeps the focused day on show, stepping the months when it walks off. */
  const moveFocus = (date: IsoDate): void => {
    setFocused(date);
    if (date < leftMonth) {
      setLeftMonth(firstOfMonth(date));
    } else if (date >= afterShown) {
      setLeftMonth(shiftMonths(firstOfMonth(date), -(MONTHS_SHOWN - 1)));
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const steps: Readonly<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -DAYS_IN_WEEK,
      ArrowDown: DAYS_IN_WEEK,
    };
    const step = steps[event.key];

    if (step !== undefined) {
      event.preventDefault();
      moveFocus(addDays(stop ?? focused, step));
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      // The day the keys are on goes with the months, to the same date a
      // month along, so it stays on show and the focus is never left on a
      // day that has gone from the grid.
      const delta = event.key === "PageUp" ? -1 : 1;
      setLeftMonth(shiftMonths(leftMonth, delta));
      setFocused(sameDayIn(stop ?? focused, delta));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const before = shiftMonths(leftMonth, -1);
  const after = shiftMonths(leftMonth, MONTHS_SHOWN);

  return (
    <div className="relative shrink-0 max-lg:hidden" ref={container}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input type="hidden" name={startName} value={start} />
      <input type="hidden" name={endName} value={end} />

      <button
        id={id}
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          const box = trigger.current?.getBoundingClientRect();
          if (box !== undefined) {
            const width = Math.min(PANEL_WIDTH, window.innerWidth - 2 * EDGE_GAP);
            const centred = box.left + box.width / 2 - width / 2;
            const furthestLeft = window.innerWidth - EDGE_GAP - width;
            setShift(Math.max(EDGE_GAP, Math.min(centred, furthestLeft)) - box.left);
          }
          setLeftMonth(firstOfMonth(start));
          setFocused(start);
          setDrawingFrom(null);
          setOpen(true);
        }}
        className={TRIGGER}
      >
        <span className="truncate tabular-nums">{formatDateRange(start, end)}</span>
        <span className="sr-only">{open ? "Close" : "Change"}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={`Choose the ${label.toLowerCase()}`}
          style={{ left: shift }}
          className="absolute top-full z-30 mt-3 w-[min(600px,calc(100vw-2rem))] rounded-card border border-rule bg-paper-raised px-5 pt-4 pb-2 shadow-md"
        >
          {/* The line over the months: which click comes next, and a step of
              one month at either end of it. */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(before))}`}
              onClick={() => {
                setLeftMonth(before);
              }}
              className={STEP}
            >
              <ArrowLeftIcon size={20} strokeWidth={1.75} />
            </button>
            <p aria-live="polite" className="text-body/none font-medium text-ink-muted">
              {drawingFrom === null ? "Choose the first day" : "Now choose the last day"}
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

          {/* The heading above says which click is next and not which day was
              clicked, so the day itself is read out here. */}
          <p aria-live="polite" className="sr-only">
            {drawingFrom === null
              ? `${READABLE.format(isoDateAsUtc(start))} to ${READABLE.format(isoDateAsUtc(end))}`
              : `${READABLE.format(isoDateAsUtc(drawingFrom))} chosen.`}
          </p>

          <div
            ref={grid}
            onKeyDown={onKeyDown}
            onMouseLeave={() => {
              setPreviewing(null);
            }}
            className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2"
          >
            {months.map((month) => {
              const cells = Array.from(
                { length: weeksShown * DAYS_IN_WEEK },
                (_unused, index) => addDays(gridStart(month), index),
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
                        {cells
                          .slice(week * DAYS_IN_WEEK, week * DAYS_IN_WEEK + DAYS_IN_WEEK)
                          .map((date) => {
                            const thisMonth = parseIsoDate(date).month === shownMonth;
                            const tooFar = furthest !== undefined && date > furthest;
                            const disabled = tooFar || !thisMonth;

                            const isStart = thisMonth && date === shownStart;
                            const isEnd = thisMonth && date === shownEnd;
                            /*
                             * The band runs under the two ends as well as
                             * between them, rounded off where it stops, so the
                             * chosen days and the days they enclose read as one
                             * selection rather than as two discs with a stripe
                             * of something else in between. A trip of one day
                             * has nothing to enclose and gets no band at all.
                             */
                            const banded =
                              thisMonth &&
                              shownEnd > shownStart &&
                              date >= shownStart &&
                              date <= shownEnd;

                            return (
                              <span
                                role="gridcell"
                                key={date}
                                aria-selected={isStart || isEnd}
                                className={[
                                  "grid h-[36px] place-items-center",
                                  banded ? "bg-terracotta-200/70" : "",
                                  banded && date === shownStart ? "rounded-l-pill" : "",
                                  banded && date === shownEnd ? "rounded-r-pill" : "",
                                ].join(" ")}
                              >
                                <button
                                  type="button"
                                  // Only on the month's own days. The same
                                  // date stands unseen at the edge of the
                                  // month beside it, and the focus looking it
                                  // up must find the one that can take it.
                                  data-date={thisMonth ? date : undefined}
                                  disabled={disabled}
                                  tabIndex={thisMonth && date === stop ? 0 : -1}
                                  aria-current={date === today ? "date" : undefined}
                                  onClick={() => {
                                    choose(date);
                                  }}
                                  onMouseEnter={() => {
                                    setPreviewing(date);
                                  }}
                                  className={[
                                    "grid h-[32px] w-[32px] place-items-center rounded-pill border font-display text-body/none font-bold tabular-nums focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta",
                                    isStart || isEnd
                                      ? "border-terracotta bg-terracotta text-terracotta-900"
                                      : date === today
                                        ? "border-terracotta text-ink"
                                        : "border-transparent text-ink hover:bg-terracotta-200",
                                    !thisMonth ? "invisible" : tooFar ? "text-ink-faint" : "",
                                  ].join(" ")}
                                >
                                  <span aria-hidden="true">{parseIsoDate(date).day}</span>
                                  <span className="sr-only">
                                    {READABLE.format(isoDateAsUtc(date))}
                                    {date === today ? ", today" : ""}
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

          {/* The panel's own bottom padding is slight, because the last row of
              days already carries room under its numerals. A button does not,
              so the footer brings its own. */}
          {footer === undefined || footer === null ? null : (
            <div className="mt-3 border-t border-rule pt-3 pb-3">{footer}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
