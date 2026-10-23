import { z } from "zod";
import { MAX_STOP_DAYS, MAX_STOPS, MAX_TRIP_DAYS } from "@/core/model/trip";
import { daysBetween } from "@/core/time/zoned";
import { calendarDate } from "./calendar-date";

const STOP_DAYS = `A stop runs 1 to ${String(MAX_STOP_DAYS)} days. Change its days and try again.`;

const CITY_MISSING = "The city is missing. Choose where you are going.";

/**
 * One stop a trip is opened with: the provider's own identifier for the city,
 * looked up on the way in rather than trusted, and how many days in it.
 */
const stopSchema = z.object({
  cityPlaceId: z
    .string()
    .trim()
    .min(1, "A stop has no city. Remove it and add the city again.")
    .max(300),
  days: z.coerce.number({ error: STOP_DAYS }).int(STOP_DAYS).min(1, STOP_DAYS).max(MAX_STOP_DAYS, STOP_DAYS),
});

/**
 * What a person may send when they open a trip.
 *
 * The cities are the provider's own identifiers rather than typed text, so
 * the map has somewhere to open and the days keep the right clock. They are
 * looked up on the way in: someone who has said which city they start in has
 * already answered the question about time zones. Nothing here names the
 * trip, which the traveller does for themselves.
 *
 * A trip is the stops it makes, in order, each a city and how many days in
 * it, from the day it departs. That is how somebody planning a holiday says
 * it, "two days in Hanoi, one in Ninh Binh", and the dates follow from it
 * rather than being counted out by hand. The open_trip tool sends it this
 * way; the front page's form is read into it by `newTripFormSchema` below.
 *
 * No trip opened here runs past a year: the most stops at the most days each
 * comes to less, which the test beside this keeps true.
 *
 * Messages say what happened and then what to do, because they are read by
 * someone who has just been stopped.
 */
export const newTripInputSchema = z
  .object({
    stops: z
      .array(stopSchema)
      .min(1, "The trip has no stops yet. Type a city and choose it from the list.")
      .max(
        MAX_STOPS,
        `A trip starts with ${String(MAX_STOPS)} stops at most. Add the rest from inside the trip.`,
      ),
    startDate: calendarDate("The day the trip departs is missing. Choose a date."),
  });

export type NewTripInput = z.infer<typeof newTripInputSchema>;

/** Both ends counted, so a trip that starts and ends on one day is one day long. */
function daysAcross(startDate: string, endDate: string): number {
  return daysBetween(startDate, endDate) + 1;
}

/**
 * What the front page's form sends: the city the trip is in, and its first
 * and last day.
 *
 * The two ends are dates rather than a length, the same way they are once the
 * trip is open: a person planning a holiday knows when they land and when they
 * fly home, and counting the nights in between is the thing they came here to
 * stop doing. Read as a trip of one stop that many days long, so it is looked
 * up and opened the way a trip of several stops is, and the one city may take
 * the whole year a trip runs to rather than the days a stop among several is
 * held to.
 */
export const newTripFormSchema = z
  .object({
    cityPlaceId: z.string({ error: CITY_MISSING }).trim().min(1, CITY_MISSING).max(300),
    startDate: calendarDate("The first day is missing. Enter a date."),
    endDate: calendarDate("The last day is missing. Enter a date."),
  })
  .refine((value) => daysAcross(value.startDate, value.endDate) >= 1, {
    message: "The last day is before the first day. Choose a later last day.",
    path: ["endDate"],
  })
  .refine((value) => daysAcross(value.startDate, value.endDate) <= MAX_TRIP_DAYS, {
    message: `A trip runs to ${String(MAX_TRIP_DAYS)} days at most. Choose an earlier last day.`,
    path: ["endDate"],
  })
  .transform(
    (value): NewTripInput => ({
      stops: [{ cityPlaceId: value.cityPlaceId, days: daysAcross(value.startDate, value.endDate) }],
      startDate: value.startDate,
    }),
  );
