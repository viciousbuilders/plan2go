import { z } from "zod";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import { daysBetween } from "@/core/time/zoned";
import { calendarDate } from "./calendar-date";

const CITY_MISSING = "The city is missing. Choose where you are going.";

/** Both ends counted, so a trip that starts and ends on one day is one day long. */
function daysAcross(startDate: string, endDate: string): number {
  return daysBetween(startDate, endDate) + 1;
}

/**
 * What a person may send when they open a trip, from the front page's form or
 * through the open_trip tool: the city the trip is in, and its first and last
 * day.
 *
 * The city is the provider's own identifier for it rather than typed text, so
 * the map has somewhere to open and the days keep the right clock. Both are
 * looked up from it on the way in: someone who has said which city they are
 * going to has already answered the question about time zones. Nothing here
 * names the trip, which the traveller does for themselves.
 *
 * The two ends are dates rather than a length, the same way they are once the
 * trip is open: a person planning a holiday knows when they land and when they
 * fly home, and counting the nights in between is the thing they came here to
 * stop doing. They are read as the one stop the trip opens with, that many days
 * in the city, which is what it is looked up and laid out from. Days are put in
 * other cities from inside the trip.
 *
 * Messages say what happened and then what to do, because they are read by
 * someone who has just been stopped.
 */
export const newTripInputSchema = z
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
  .transform((value) => ({
    stops: [{ cityPlaceId: value.cityPlaceId, days: daysAcross(value.startDate, value.endDate) }],
    startDate: value.startDate,
  }));

export type NewTripInput = z.output<typeof newTripInputSchema>;
