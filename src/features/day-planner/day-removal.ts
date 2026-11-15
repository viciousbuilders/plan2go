import type { DayPlan } from "@/core/model/day";
import { DEFAULT_START_AT_MINUTES } from "@/core/model/day";
import { formatClock } from "@/core/time/minutes";
import { formatDayLong } from "./format-day-date";

/**
 * The question asked before a day is reset or taken off the trip, worked out
 * from the day and the trip as they are, so it says exactly what goes and
 * what moves rather than that something will.
 */
export interface DayQuestion {
  /** What the question is called, to a screen reader. */
  readonly label: string;
  readonly question: string;
  /** What answering it does, with the numbers and dates in it. */
  readonly detail: string;
  /** The answer that changes nothing. */
  readonly cancel: "Cancel" | "Close";
  /** What the answer that does it does, or null for a question that can only be put away. */
  readonly does: "reset" | "delete" | null;
}

/** "A", "A and B", "A, B and C": how a sentence lists things. */
export function listed(items: readonly string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1] ?? ""}`;
}

function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Day 3", "Days 3 and 4", "Days 3 to 5". */
function dayRun(first: number, last: number): string {
  if (last <= first) {
    return `Day ${String(first)}`;
  }
  return `Days ${String(first)} ${last === first + 1 ? "and" : "to"} ${String(last)}`;
}

/**
 * What a day has on it that resetting it or taking it off the trip takes
 * with it, in the words a sentence lists them in: its stops, then its two
 * ends. Each stop's stay and note go with it and are not counted apart.
 */
export function onTheDay(day: DayPlan): readonly string[] {
  const things: string[] = [];
  const stops = day.stops.length;
  if (stops > 0) {
    things.push(stops === 1 ? "the stop on it" : `the ${String(stops)} stops on it`);
  }
  if (day.start !== null) {
    things.push("its start point");
  }
  if (day.end !== null) {
    things.push("its end point");
  }
  return things;
}

/**
 * Whether resetting the day would change anything: it has something on it, or
 * it leaves at another hour than a new day does. A day that is already as a
 * new day starts has nothing to reset, and is not offered it.
 */
export function canReset(day: DayPlan): boolean {
  return onTheDay(day).length > 0 || day.startAtMinutes !== DEFAULT_START_AT_MINUTES;
}

/** What resetting a day does, said before it is done. */
function resetDetail(day: DayPlan): string {
  const things = onTheDay(day);
  const many = things.length > 1 || day.stops.length > 1;
  const off = things.length === 0 ? null : `${listed(things)} ${many ? "come" : "comes"} off`;
  const leaves =
    day.startAtMinutes === DEFAULT_START_AT_MINUTES
      ? null
      : `it leaves at ${formatClock(DEFAULT_START_AT_MINUTES)} again`;
  const happens = [off, leaves].filter((part) => part !== null).join(", and ");
  return [
    `${capitalised(happens)}.`,
    day.city === null ? null : `It stays in ${day.city.name}.`,
    "This cannot be undone.",
  ]
    .filter((line) => line !== null)
    .join(" ");
}

/**
 * Asked before a day is reset: what comes off it, the hour it leaves at
 * again, and that its city stays.
 */
export function resetQuestion(day: DayPlan, number: number): DayQuestion {
  const named = `Day ${String(number)}`;
  return {
    label: `Reset ${named}`,
    question: `Reset ${named}?`,
    detail: resetDetail(day),
    cancel: "Cancel",
    does: "reset",
  };
}

/**
 * Asked before a day is taken off the trip: which day by its number and date,
 * what goes with it, which days move a day earlier, and the date the trip
 * then ends on. The trip keeps its first date, so the end is the date the day
 * before the last has now.
 *
 * A trip's only day cannot be taken off, since a trip keeps at least one, so
 * that is said instead, with resetting the day offered in its place when
 * there is anything to reset.
 */
export function deleteQuestion(days: readonly DayPlan[], index: number): DayQuestion {
  const day = days[index];
  const number = index + 1;
  const named = `Day ${String(number)}`;
  if (day === undefined) {
    return { label: named, question: named, detail: "", cancel: "Close", does: null };
  }

  if (days.length <= 1) {
    const kept = "A trip keeps at least one day, so it cannot be deleted.";
    return canReset(day)
      ? {
          label: `${named} cannot be deleted`,
          question: `${named} is the trip's only day`,
          detail: `${kept} Reset it instead? ${resetDetail(day)}`,
          cancel: "Cancel",
          does: "reset",
        }
      : {
          label: `${named} cannot be deleted`,
          question: `${named} is the trip's only day`,
          detail: `${kept} To start over, delete the whole trip from the trip's menu.`,
          cancel: "Close",
          does: null,
        };
  }

  const things = onTheDay(day);
  const goes = `${named}, ${formatDayLong(day.date)}, comes off the trip${
    things.length === 0 ? "" : ` with ${listed(things)}`
  }.`;
  const last = days[days.length - 1];
  const newLast = days[days.length - 2];
  const after = days.length - number;
  const moves =
    last === undefined || newLast === undefined
      ? null
      : after === 0
        ? `The trip then ends on ${formatDayLong(newLast.date)}.`
        : `${dayRun(number + 1, days.length)} ${after === 1 ? "moves" : "each move"} a day earlier, and the trip ends on ${formatDayLong(newLast.date)} instead of ${formatDayLong(last.date)}.`;
  return {
    label: `Delete ${named}`,
    question: `Delete ${named}?`,
    detail: [goes, moves, "This cannot be undone."].filter((line) => line !== null).join(" "),
    cancel: "Cancel",
    does: "delete",
  };
}
