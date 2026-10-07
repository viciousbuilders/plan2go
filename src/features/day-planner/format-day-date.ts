import type { IsoDate } from "@/core/model/day";
import { parseIsoDate } from "@/core/time/zoned";

const DAY_FORMAT = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "Sat 22 Aug". The date is a calendar date, so it is read in UTC. */
export function formatDayDate(date: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  return DAY_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

const LONG_FORMAT = new Intl.DateTimeFormat("en-AU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "Thursday 10 September", for the printed page, which has room to say it in full. */
export function formatDayLong(date: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  return LONG_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

const TAB_FORMAT = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Thu 10". A tab is a handle, not a sentence. */
export function formatDayTab(date: IsoDate): string {
  const { year, month, day } = parseIsoDate(date);
  return TAB_FORMAT.format(new Date(Date.UTC(year, month - 1, day)));
}

const DAY_ONLY = new Intl.DateTimeFormat("en-AU", { day: "numeric", timeZone: "UTC" });

const WEEKDAY_ONLY = new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" });

/**
 * A tab's words, "Thu" and "10", apart, for a chip that sets the weekday over
 * the date rather than beside it.
 */
export function formatDayChip(date: IsoDate): { readonly weekday: string; readonly day: string } {
  const { year, month, day } = parseIsoDate(date);
  const at = new Date(Date.UTC(year, month - 1, day));
  return { weekday: WEEKDAY_ONLY.format(at), day: DAY_ONLY.format(at) };
}
