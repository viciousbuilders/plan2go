import { conflictsAtStop } from "@/core/model/conflict";
import { formatDistance } from "@/core/model/distance";
import type { Trip } from "@/core/model/trip";
import type { ClockTime } from "@/core/time/compute-day";
import { formatDateRange, formatTripDates } from "@/core/time/date-range";
import { formatClock, formatDuration } from "@/core/time/minutes";
import { parseIsoDate } from "@/core/time/zoned";
import type { LegOption, PlannedDay } from "@/features/day-planner/compute-trip";
import { conflictSentence } from "@/features/day-planner/conflict-sentence";
import { endpointName } from "@/features/day-planner/endpoint-name";
import { rideSentence } from "@/features/day-planner/export/transit-ride";
import { dayDone, routeOf } from "@/features/day-planner/export/trip-summary";
import { formatDayLong } from "@/features/day-planner/format-day-date";
import { formatDayTime } from "@/features/day-planner/format-day-time";
import { hoursOn } from "@/features/day-planner/format-opening-hours";
import { formatStops } from "@/features/day-planner/format-stops";
import { MODE_WORDS } from "@/features/day-planner/leg-marks";

/**
 * A trip written out as text for a model to read and pass on: the same days,
 * times, legs and conflicts the page draws, in the words the page uses, one
 * row of the day to a line.
 */

/** Wide enough for "08:45-10:15", so the names of a day line up under each other. */
const TIME_WIDTH = 11;

/** Between the time column and the words. */
const GUTTER = "  ";

/** One row of a day: when, then what. A row with no time keeps its column empty. */
function row(when: string, what: string): string {
  return `${when.padEnd(TIME_WIDTH)}${GUTTER}${what}`;
}

/** A line under a row, lined up with its words. */
function under(what: string): string {
  return row("", what);
}

/**
 * When a stop is reached and left, "08:45-10:15". The day is said once, at
 * the end, when both fall on the same one: "00:30-01:30 next day". A stop
 * passed by, with no time there, has the one time it is passed at.
 */
function span(from: ClockTime, to: ClockTime): string {
  if (from.epochMinutes === to.epochMinutes) {
    return formatDayTime(from);
  }
  const start =
    from.dayOffset === to.dayOffset ? formatClock(from.minutesFromMidnight) : formatDayTime(from);
  return `${start}-${formatDayTime(to)}`;
}

/** "Drive 9 min", "about 9 min" when it is a guess, "Drive unavailable" when nothing was found. */
function optionWords(option: LegOption): string {
  if (option.durationMinutes === null) {
    return `${MODE_WORDS[option.mode]} unavailable`;
  }
  return `${MODE_WORDS[option.mode]} ${option.rough ? "about " : ""}${formatDuration(option.durationMinutes)}`;
}

/**
 * The lines for one leg, under the row it sets out from: the way it is
 * travelled, how long and how far, what to catch on public transport, and the
 * other ways and what they would take, which is what someone deciding how to
 * get there chooses between. A guess says it is one, and a leg nobody could
 * answer says so with the conflict it causes.
 *
 * With `directions`, a leg that can be made also has the link the page puts
 * under it, to the same journey in Google Maps on the day and at the moment
 * it is made, where the traffic and the timetable live.
 */
function legLines(day: PlannedDay, legIndex: number, directions: boolean): readonly string[] {
  const leg = day.computed.legs[legIndex];
  const planned = day.legs[legIndex];
  if (leg === undefined || planned === undefined) {
    return [];
  }
  const chosen = planned.options.find((option) => option.mode === planned.chosen);
  const way = MODE_WORDS[leg.mode];
  const lines: string[] = [];

  if (leg.durationMinutes === null) {
    lines.push(`No ${way.toLowerCase()} at this time.`);
    const unanswered = day.computed.conflicts.find(
      (conflict) => conflict.kind === "unresolved-leg" && conflict.legIndex === legIndex,
    );
    if (unanswered !== undefined) {
      lines.push(`Conflict: ${conflictSentence(unanswered)}`);
    }
  } else {
    const rough = chosen?.rough ?? false;
    const distance = leg.distanceMeters === null ? "" : ` · ${formatDistance(leg.distanceMeters)}`;
    lines.push(`${way} ${rough ? "about " : ""}${formatDuration(leg.durationMinutes)}${distance}`);
    if (rough) {
      lines.push(`No ${way.toLowerCase()} route was found here. The time is a guess from the distance.`);
    }
    if (leg.mode === "transit") {
      lines.push(...(chosen?.rides ?? []).map(rideSentence));
    }
    if (directions && planned.directions !== null) {
      lines.push(`Live times in Google Maps: ${planned.directions}`);
    }
  }

  const others = planned.options.filter((option) => option.mode !== planned.chosen);
  if (others.length > 0) {
    lines.push(`Other ways: ${others.map(optionWords).join(", ")}`);
  }
  return lines.map(under);
}

/**
 * The day as rows, in the order it is lived: where it leaves from, each stop
 * with the leg that reaches it, and where it ends with the leg there. A stop
 * after a leg nobody could answer has no times, and says so rather than
 * showing made up ones.
 */
function dayRows(day: PlannedDay, directions: boolean): readonly string[] {
  const { plan, computed } = day;
  /** With no start point the first stop has no leg arriving at it. */
  const legOffset = plan.start === null ? -1 : 0;
  const lines: string[] = [];

  if (plan.start !== null) {
    lines.push(row(formatDayTime(computed.begins), `Leave from ${endpointName(plan.start)}`));
  }

  computed.stops.forEach((stop, index) => {
    const arriving = index + legOffset;
    if (arriving >= 0) {
      lines.push(...legLines(day, arriving, directions));
    }
    const when =
      stop.arrival === null || stop.departure === null ? null : span(stop.arrival, stop.departure);
    lines.push(
      row(
        when ?? "",
        `Stop ${String(index + 1)}: ${stop.placeName} (${formatDuration(stop.stayMinutes)})${when === null ? ", not timed" : ""}`,
      ),
    );

    const planned = plan.stops[index];
    const hours = planned === undefined ? null : hoursOn(planned.place, plan);
    if (hours !== null) {
      lines.push(under(hours));
    }
    for (const conflict of conflictsAtStop(computed.conflicts, stop.stopId)) {
      lines.push(under(`Conflict: ${conflictSentence(conflict)}`));
    }
    const note = planned?.note ?? null;
    if (note !== null) {
      lines.push(under(`Note: ${note}`));
    }
  });

  const toEnd = computed.legs[computed.legs.length - 1];
  if (plan.end !== null && toEnd !== undefined) {
    const back = plan.start !== null && plan.start.place.id === plan.end.place.id;
    lines.push(...legLines(day, toEnd.index, directions));
    lines.push(
      row(
        computed.ends === null ? "" : formatDayTime(computed.ends),
        `${back ? "Back at" : "Finish at"} ${endpointName(plan.end)}`,
      ),
    );
  }

  return lines;
}

/**
 * What the day comes to, as the strip under a printed day's name has it: when
 * it leaves, when it is over in the words of the row it points at, how many
 * stops, and how long is spent travelling. A time nobody could work out is
 * left off rather than guessed.
 */
function dayStats(day: PlannedDay): string {
  const { plan, computed } = day;
  const done = dayDone(day);
  const travel = computed.totals.travelMinutes;
  return [
    `Leave ${formatClock(plan.startAtMinutes)}`,
    done.at === null ? null : `${done.label} ${formatDayTime(done.at)}`,
    formatStops(plan.stops.length),
    travel === null ? null : `Travelling ${formatDuration(travel)}`,
  ]
    .filter((part) => part !== null)
    .join(" · ");
}

/** "Day 2 · Sunday 25 October 2026 · Hanoi", with the number the tools know the day by. */
function dayHeading(day: PlannedDay, number: number): string {
  const { plan } = day;
  return [
    `Day ${String(number)}`,
    `${formatDayLong(plan.date)} ${String(parseIsoDate(plan.date).year)}`,
    plan.city?.name ?? null,
  ]
    .filter((part) => part !== null)
    .join(" · ");
}

/**
 * Days one after another, by the numbers the tools know them by, as the
 * planner's dates name the days a shorter trip loses: "Day 6", "Days 6 and
 * 7", "Days 6 to 9".
 */
export function dayRun(first: number, last: number): string {
  if (last <= first) {
    return `Day ${String(first)}`;
  }
  return `Days ${String(first)} ${last === first + 1 ? "and" : "to"} ${String(last)}`;
}

/**
 * One day whole: its heading, what it comes to, and its rows. The links to
 * Google Maps are left off unless asked for: a day given back after a change
 * is read for its times, and the next change moves the moments they open on.
 */
export function dayText(day: PlannedDay, number: number, directions = false): string {
  const opening = day.plan.stops.length === 0 ? "Nothing planned yet." : dayStats(day);
  return [dayHeading(day, number), opening, ...dayRows(day, directions)].join("\n");
}

/**
 * The whole trip: its name, when it runs and where it goes, the clock every
 * time is on, the link to hand to the people travelling, and then each day,
 * with the link to Google Maps the page puts under every leg that can be made.
 * The editing link is never written here, whichever link the trip was read by.
 */
export function tripText(trip: Trip, days: readonly PlannedDay[], readLink: string): string {
  const plans = days.map((day) => day.plan);
  const first = plans[0];
  const last = plans[plans.length - 1];
  const route = routeOf(plans);

  const heading = [
    trip.title,
    first === undefined || last === undefined ? null : formatTripDates(first.date, last.date),
    route === null || route.length === 0
      ? null
      : route.map((stay) => `${stay.city} ${formatDateRange(stay.from, stay.to)}`).join(", then "),
    `All times are local time in ${trip.timeZone}.`,
    `Read only link: ${readLink}`,
  ].filter((line) => line !== null);

  return [heading.join("\n"), ...days.map((day, index) => dayText(day, index + 1, true))].join(
    "\n\n",
  );
}
