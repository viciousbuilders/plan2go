"use client";

import type { KeyboardEvent, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** Six weeks, the most a month spans: a long one that starts on a Saturday or a Sunday. */
const WEEKS_SHOWN = 6;

/** As wide as the design draws it, or the ticket where the ticket is narrower. */
const CALENDAR_WIDTH = 320;

/**
 * How tall it is before it has been drawn to be measured: its padding, the
 * line with the arrows, the weekdays and six weeks of 40px, 12px apart.
 */
const CALENDAR_HEIGHT = 352;

/** Between the field and the calendar, the mt-3 or mb-3 it is drawn with. */
const FIELD_GAP = 12;

/** How far left of the field the calendar starts. */
const LEAD = 8;

/** Room it keeps from the foot of the page when it opens under the field. */
const PAGE_ROOM = 8;

const STEP =
  "grid h-9 w-9 flex-none place-items-center rounded-pill text-terracotta-700 hover:bg-terracotta-100 disabled:opacity-45 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-terracotta";

/** Where the calendar stands: its left edge from the field's, its width, and whether it is under the field. */
interface Place {
  readonly left: number;
  readonly width: number;
  readonly below: boolean;
}

interface DepartureFieldProps {
  /** Today on the reader's own clock, the earliest day a trip can depart, or null until the browser has said. */
  readonly today: IsoDate | null;
  /** The day the trip departs, or null until the browser has said what today is. */
  readonly start: IsoDate | null;
  /** The ticket, which the calendar is kept inside from side to side. */
  readonly within: RefObject<HTMLElement | null>;
  readonly onChange: (start: IsoDate) => void;
}

/**
 * The day the trip departs, chosen from a calendar of the product's own rather
 * than the browser's, which is drawn by the browser in a system's colours and
 * cannot be reached with CSS. Drawn and placed as the start page's design has
 * it: the month's name between a step to the month before and one to the
 * month after, the weekdays under them, and six weeks of days, every day a
 * disc, the days of the months either side in a fainter ink.
 *
 * One press chooses: the trip departs that day, and the calendar goes. Days
 * before today are shown and not offered.
 *
 * Six weeks whatever the month, so the calendar is one size from month to
 * month and the arrows on it stay where a pointer pressing on through the
 * months left them. It opens 12px under the field, from a little left of it
 * and kept inside the ticket, or 12px over it where the page has no room for
 * it before its foot, and finds its place again if the window changes size
 * while it is open. The arrow keys walk the days, stepping the month when
 * they walk off it, Page Up and Page Down go a month, and Escape puts it
 * away, the focus back on the field each time it goes.
 */
export function DepartureField({ today, start, within, onChange }: DepartureFieldProps) {
  const [open, setOpen] = useState(false);
  /** The month on show, as its first day, and the day the keys are on, both set as it opens. */
  const [month, setMonth] = useState<IsoDate | null>(null);
  const [focused, setFocused] = useState<IsoDate | null>(null);
  const [place, setPlace] = useState<Place>({ left: -LEAD, width: CALENDAR_WIDTH, below: true });
  /**
   * Set as the keys move the day, or as the calendar opens, and let go of once
   * the focus has followed, so the focus is only taken when they ask for it:
   * never by the arrows over the month, which leave it where it was.
   */
  const steered = useRef(false);
  const container = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const calendar = useRef<HTMLDivElement | null>(null);
  const grid = useRef<HTMLDivElement | null>(null);

  /**
   * Placed once it is drawn and before it is seen, and again whenever the
   * window changes size while it is open: under the field where the page has
   * room for it before its foot, else over it.
   */
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const placeIt = (): void => {
      const field = container.current?.getBoundingClientRect();
      const button = trigger.current?.getBoundingClientRect();
      const ticket = within.current?.getBoundingClientRect();
      if (field === undefined || button === undefined || ticket === undefined) {
        return;
      }
      const width = Math.min(CALENDAR_WIDTH, ticket.width);
      const height = calendar.current?.offsetHeight ?? CALENDAR_HEIGHT;
      const fromTicket = Math.max(0, Math.min(button.left - ticket.left - LEAD, ticket.width - width));
      const pageFoot = document.body.getBoundingClientRect().bottom;
      setPlace({
        left: ticket.left + fromTicket - field.left,
        width,
        below: button.bottom + FIELD_GAP + height <= pageFoot - PAGE_ROOM,
      });
    };
    placeIt();
    window.addEventListener("resize", placeIt);
    return () => {
      window.removeEventListener("resize", placeIt);
    };
  }, [open, within]);

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

  const openCalendar = (): void => {
    if (start === null) {
      return;
    }
    setMonth(firstOfMonth(start));
    setFocused(start);
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
    const cells = Array.from({ length: WEEKS_SHOWN * DAYS_IN_WEEK }, (_unused, index) =>
      addDays(gridStart(month), index),
    );
    const shownMonth = parseIsoDate(month).month;
    const monthName = MONTH_AND_YEAR.format(isoDateAsUtc(month));
    /** Nothing before today's month is offered, so there is no stepping back to it. */
    const canGoBack = month > firstOfMonth(today);
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
      <div
        ref={calendar}
        role="dialog"
        aria-label="Choose the day the trip departs"
        style={{ left: place.left, width: place.width }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            putAway();
          }
        }}
        // The design's shadow, in the accent's darkest brown as the ticket's own is.
        className={`absolute z-20 flex flex-col gap-3 rounded-[24px] bg-paper-raised p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--color-terracotta-900)_18%,transparent)] ${
          place.below ? "top-full mt-3" : "bottom-full mb-3"
        }`}
      >
        {/* The month, between a step of one month either way, each named for
            the month it goes to. */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(before))}`}
            disabled={!canGoBack}
            onClick={() => {
              setMonth(before);
            }}
            className={STEP}
          >
            <ArrowLeftIcon size={18} strokeWidth={2.75} />
          </button>
          <p className="text-[16px] leading-none font-bold text-ink">{monthName}</p>
          <button
            type="button"
            aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(after))}`}
            onClick={() => {
              setMonth(after);
            }}
            className={STEP}
          >
            <ArrowRightIcon size={18} strokeWidth={2.75} />
          </button>
        </div>

        <div ref={grid} role="grid" aria-label={monthName} onKeyDown={onKeyDown} className="flex flex-col gap-3">
          <div role="row" className="grid grid-cols-7">
            {WEEKDAYS.map((weekday, index) => (
              <span
                key={index}
                role="columnheader"
                className="text-center text-[12px] leading-none font-semibold text-ink-faint"
              >
                <span aria-hidden="true">{weekday.short}</span>
                <span className="sr-only">{weekday.full}</span>
              </span>
            ))}
          </div>
          <div role="rowgroup">
            {Array.from({ length: WEEKS_SHOWN }, (_unused, week) => (
              <div role="row" key={week} className="grid h-10 grid-cols-7 place-items-center">
                {cells.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK).map((date) => {
                  const inMonth = parseIsoDate(date).month === shownMonth;
                  const early = date < today;
                  const chosen = inMonth && date === start;
                  return (
                    <span role="gridcell" key={date} aria-selected={chosen}>
                      <button
                        type="button"
                        data-date={date}
                        disabled={early}
                        tabIndex={date === stop ? 0 : -1}
                        aria-current={date === today ? "date" : undefined}
                        onClick={() => {
                          pick(date);
                        }}
                        // The day it departs filled in the accent's deepest
                        // brown, as a chosen day is anywhere in the product,
                        // the months either side fainter than this one, and
                        // the days before today faintest of all.
                        className={[
                          "grid h-9 w-9 place-items-center rounded-pill text-[14px] leading-none font-bold focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-terracotta",
                          chosen
                            ? "bg-terracotta-800 text-sheet"
                            : early
                              ? "text-ink/30"
                              : inMonth
                                ? "text-ink hover:bg-terracotta-100"
                                : "text-ink/45 hover:bg-terracotta-100",
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
            openCalendar();
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
