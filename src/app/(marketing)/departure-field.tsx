"use client";

import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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

/** Tailwind's md, from which the ticket is laid out as on a desk. */
const WIDE = "(min-width: 48rem)";

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
  "grid flex-none place-items-center rounded-pill text-terracotta-700 hover:bg-terracotta-100 disabled:opacity-45 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-terracotta";

/** How big the parts of the month are drawn: a step either way, its glyph, the month's name, a week, a day. */
interface Sizes {
  readonly step: string;
  readonly glyph: number;
  readonly title: string;
  readonly week: string;
  readonly day: string;
}

/** A desk's, as the start page's design draws it. */
const DESK: Sizes = {
  step: "h-9 w-9",
  glyph: 18,
  title: "text-[16px]",
  week: "h-10",
  day: "h-9 w-9 text-[14px]",
};

/** A phone's, as the mobile design draws its sheet: every day and step a finger's. */
const PHONE: Sizes = {
  step: "h-11 w-11",
  glyph: 20,
  title: "text-[17px]",
  week: "h-12",
  day: "h-11 w-11 text-[15px]",
};

/** Where the calendar stands: its left edge from the field's, its width, and whether it is under the field. */
interface Place {
  readonly left: number;
  readonly width: number;
  readonly below: boolean;
}

function watchWidth(onChange: () => void): () => void {
  const wide = window.matchMedia(WIDE);
  wide.addEventListener("change", onChange);
  return () => {
    wide.removeEventListener("change", onChange);
  };
}

interface DepartureFieldProps {
  /** Today on the reader's own clock, the earliest day a trip can depart, or null until the browser has said. */
  readonly today: IsoDate | null;
  /** The day the trip departs, or null until the browser has said what today is. */
  readonly start: IsoDate | null;
  /** The ticket, which a desk's calendar is kept inside from side to side. */
  readonly within: RefObject<HTMLElement | null>;
  readonly onChange: (start: IsoDate) => void;
}

/**
 * The day the trip departs, chosen from a calendar of the product's own rather
 * than the browser's, which is drawn by the browser in a system's colours and
 * cannot be reached with CSS. Drawn as the start page's two designs draw it:
 * the month's name between a step to the month before and one to the month
 * after, the weekdays under them, and six weeks of days, every day a disc,
 * the days of the months either side in a fainter ink.
 *
 * One press chooses: the trip departs that day, and the calendar goes. Days
 * before today are shown and not offered.
 *
 * Six weeks whatever the month, so the calendar is one size from month to
 * month and the arrows on it stay where a pointer pressing on through the
 * months left them.
 *
 * On a desk it opens 12px under the field, from a little left of it and kept
 * inside the ticket, or 12px over it where the page has no room for it before
 * its foot, and finds its place again if the window changes size while it is
 * open. On a phone it comes up from the foot of the window as a sheet, over
 * the page dimmed, with a handle and the words saying what it is for over the
 * month, every day and step a finger's size; a press on the dimmed page puts
 * it away. The arrow keys walk the days, stepping the month when they walk
 * off it, Page Up and Page Down go a month, and Escape puts it away, the
 * focus back on the field each time it goes.
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
   * Whether the ticket is a desk's, which decides between the calendar beside
   * the field and the sheet. Taken as a desk's on the server, which cannot
   * know, and settled once the browser has said; the calendar is only ever
   * open in the browser.
   */
  const desk = useSyncExternalStore(
    watchWidth,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );

  /**
   * A desk's calendar, placed once it is drawn and before it is seen, and
   * again whenever the window changes size while it is open: under the field
   * where the page has room for it before its foot, else over it.
   */
  useLayoutEffect(() => {
    if (!open || !desk) {
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
  }, [open, desk, within]);

  useEffect(() => {
    if (!open || !steered.current || focused === null) {
      return;
    }
    steered.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [open, focused, month]);

  // A desk's calendar goes at a press anywhere outside it. A phone's sheet
  // lies over a dimmed page that puts it away itself, and stands outside the
  // field, where a press inside it would read as one outside.
  useOutsidePress(container, open && desk, () => {
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

  const onEscape = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      putAway();
    }
  };

  const panel = ((): ReactNode => {
    if (!open || start === null || today === null || month === null || focused === null) {
      return null;
    }
    const sizes = desk ? DESK : PHONE;
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

    const body = (
      <>
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
            className={`${STEP} ${sizes.step}`}
          >
            <ArrowLeftIcon size={sizes.glyph} strokeWidth={2.75} />
          </button>
          <p className={`${sizes.title} leading-none font-bold text-ink`}>{monthName}</p>
          <button
            type="button"
            aria-label={`Go to ${MONTH_AND_YEAR.format(isoDateAsUtc(after))}`}
            onClick={() => {
              setMonth(after);
            }}
            className={`${STEP} ${sizes.step}`}
          >
            <ArrowRightIcon size={sizes.glyph} strokeWidth={2.75} />
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
              <div role="row" key={week} className={`grid ${sizes.week} grid-cols-7 place-items-center`}>
                {cells.slice(week * DAYS_IN_WEEK, (week + 1) * DAYS_IN_WEEK).map((date) => {
                  const inMonth = parseIsoDate(date).month === shownMonth;
                  const early = date < today;
                  // The phone's design fills the day it departs wherever it
                  // stands in the six weeks; the desk's only in its own month.
                  const chosen = date === start && (inMonth || !desk);
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
                          `grid ${sizes.day} place-items-center rounded-pill leading-none font-bold focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-terracotta`,
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
      </>
    );

    if (desk) {
      return (
        <div
          ref={calendar}
          role="dialog"
          aria-label="Choose the day the trip departs"
          style={{ left: place.left, width: place.width }}
          onKeyDown={onEscape}
          // The design's shadow, in the accent's darkest brown as the ticket's own is.
          className={`absolute z-20 flex flex-col gap-3 rounded-[24px] bg-paper-raised p-5 shadow-[0_18px_40px_color-mix(in_srgb,var(--color-terracotta-900)_18%,transparent)] ${
            place.below ? "top-full mt-3" : "bottom-full mb-3"
          }`}
        >
          {body}
        </div>
      );
    }

    // At the foot of the page rather than in the ticket: the ticket's shadow
    // is a filter, and a filter makes the window's edges its own, so a sheet
    // fixed to the window inside it would be fixed to the ticket instead.
    return createPortal(
      <div className="fixed inset-0 z-50">
        <div aria-hidden="true" onClick={putAway} className="absolute inset-0 touch-none bg-ink/32" />
        <div
          ref={calendar}
          role="dialog"
          aria-modal="true"
          aria-label="Choose the day the trip departs"
          onKeyDown={onEscape}
          // The design's shadow, cast upwards, in the accent's darkest brown
          // as the ticket's own is; and room at its foot for a phone's own
          // edge where it has one.
          className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[28px] bg-paper-raised px-5 pt-3 pb-[max(32px,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_color-mix(in_srgb,var(--color-terracotta-900)_18%,transparent)]"
        >
          <span aria-hidden="true" className="h-[5px] w-10 flex-none self-center rounded-pill bg-ink/18" />
          <p className={`${FIELD_LABEL} pt-1`}>Choose the day you depart</p>
          {body}
        </div>
      </div>,
      document.body,
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
          {/* 14px beside the date, as the phone's design draws it, and a
              desk writes the date at the phone's size too. Turned over while
              the calendar is open only on a desk: on a phone the sheet
              stands over it. */}
          <ChevronDownIcon
            size={14}
            strokeWidth={2.75}
            className={`flex-none text-terracotta-700 ${open ? "md:rotate-180" : ""}`}
          />
        </span>
      </button>
      {panel}
    </div>
  );
}
