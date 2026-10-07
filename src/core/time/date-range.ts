import type { IsoDate } from "../model/day";
import { daysBetween, isoDateAsUtc, parseIsoDate } from "./zoned";

/**
 * The trip's two ends, as every part of the product writes them: the name's
 * row and the calendar on a desk, the head of a phone's page, Edit trip's
 * page, the export, and the printed sheets. Here rather than in any one
 * feature, because all of them say it and none may reach into another.
 */

const DAY_ONLY = new Intl.DateTimeFormat("en-AU", { day: "numeric", timeZone: "UTC" });

const DAY_MONTH = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * The two ends of a trip said as shortly as they can be without becoming
 * ambiguous: "19 to 23 Sept". The month is written once when both ends share
 * it, and the year only appears when the trip crosses one. Joined by a word
 * rather than a dash, which the product never writes.
 */
export function formatDateRange(start: IsoDate, end: IsoDate): string {
  if (start === end) {
    return DAY_MONTH.format(isoDateAsUtc(start));
  }
  const from = parseIsoDate(start);
  const to = parseIsoDate(end);
  if (from.year !== to.year) {
    return `${DAY_MONTH_YEAR.format(isoDateAsUtc(start))} to ${DAY_MONTH_YEAR.format(isoDateAsUtc(end))}`;
  }
  if (from.month !== to.month) {
    return `${DAY_MONTH.format(isoDateAsUtc(start))} to ${DAY_MONTH.format(isoDateAsUtc(end))}`;
  }
  return `${DAY_ONLY.format(isoDateAsUtc(start))} to ${DAY_MONTH.format(isoDateAsUtc(end))}`;
}

/**
 * The trip's two ends as formatDateRange writes them, then how many days they
 * come to with both ends counted, "· 5 days": the line under the trip's name
 * on a phone, and under the dates being drawn on Edit trip's page. A range
 * that runs backwards, which the dates field says is wrong, has no count.
 */
export function formatTripDates(start: IsoDate, end: IsoDate): string {
  const range = formatDateRange(start, end);
  const days = daysBetween(start, end) + 1;
  if (days < 1) {
    return range;
  }
  return `${range} · ${String(days)} ${days === 1 ? "day" : "days"}`;
}
