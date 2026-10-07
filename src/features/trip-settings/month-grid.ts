import type { IsoDate } from "@/core/model/day";
import { addDays, daysBetween, parseIsoDate, weekdayOf } from "@/core/time/zoned";

/**
 * How a month is laid out as a grid of weeks, for the two calendars the trip's
 * dates are chosen on: the dates field's, on a desk and on the starter page,
 * and Edit trip's on a phone.
 */

export const DAYS_IN_WEEK = 7;

/** Monday first, because that is how a week reads here. */
export const WEEKDAYS = [
  { short: "M", full: "Monday" },
  { short: "T", full: "Tuesday" },
  { short: "W", full: "Wednesday" },
  { short: "T", full: "Thursday" },
  { short: "F", full: "Friday" },
  { short: "S", full: "Saturday" },
  { short: "S", full: "Sunday" },
];

export const MONTH_AND_YEAR = new Intl.DateTimeFormat("en-AU", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** A day as it is read out, weekday and year included. */
export const READABLE = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function iso(year: number, month: number, day: number): IsoDate {
  const pad = (value: number, width: number): string =>
    String(value).padStart(width, "0");
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function firstOfMonth(date: IsoDate): IsoDate {
  const { year, month } = parseIsoDate(date);
  return iso(year, month, 1);
}

/** Month arithmetic on the first of a month, which never overflows a short month. */
export function shiftMonths(first: IsoDate, delta: number): IsoDate {
  const { year, month } = parseIsoDate(first);
  const index = year * 12 + (month - 1) + delta;
  return iso(Math.floor(index / 12), (index % 12) + 1, 1);
}

/**
 * The same date a number of months away, or the last of that month where it
 * is shorter: where Page Up and Page Down take the day the keys are on.
 */
export function sameDayIn(date: IsoDate, delta: number): IsoDate {
  const first = shiftMonths(firstOfMonth(date), delta);
  const length = daysBetween(first, shiftMonths(first, 1));
  return addDays(first, Math.min(parseIsoDate(date).day, length) - 1);
}

/** The Monday on or before the first of the month the grid is showing. */
export function gridStart(first: IsoDate): IsoDate {
  return addDays(first, -((weekdayOf(first) + 6) % DAYS_IN_WEEK));
}

/** How many rows of seven it takes to show every day of the month. */
export function weeksIn(first: IsoDate): number {
  const days = daysBetween(gridStart(first), shiftMonths(first, 1));
  return Math.ceil(days / DAYS_IN_WEEK);
}
