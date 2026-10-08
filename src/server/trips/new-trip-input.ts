import { z } from "zod";
import { MAX_STOP_DAYS, MAX_STOPS } from "@/core/model/trip";
import { calendarDate } from "./calendar-date";

const STOP_DAYS = `A stop runs 1 to ${String(MAX_STOP_DAYS)} days. Change its days and try again.`;

/**
 * One stop as the front page sends it: the provider's own identifier for the
 * city, looked up on the way in rather than trusted, and how many days in it.
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
 * rather than being counted out by hand.
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
