import { z } from "zod";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import { daysBetween } from "@/core/time/zoned";
import { calendarDate } from "./calendar-date";

/**
 * What a traveller may change about a trip once it is open. A trip is not one
 * city, so the name is whatever they call the whole thing rather than a place.
 *
 * The time zone is not here. It is settled when the trip is opened and is not
 * something the traveller is asked about.
 *
 * The two ends of the trip are dates, not a length: a person planning a holiday
 * knows when they land and when they fly home, and counting the nights in
 * between is the thing they came here to stop doing. They are a year apart at
 * most, as a new trip's are and as adding a day keeps them.
 *
 * Messages say what happened and then what to do, because they are read by
 * someone who has just been stopped. The name's are shorter than that: they
 * are shown hanging off the field itself, which has already said which one.
 */
export const tripSettingsSchema = z
  .object({
    slug: z.string().min(1).max(80),
    title: z
      .string()
      .trim()
      .min(1, "Give the trip a name.")
      .max(80, "Use 80 characters or fewer."),
    startDate: calendarDate("The first day is missing. Enter a date."),
    endDate: calendarDate("The last day is missing. Enter a date."),
  })
  .refine((value) => daysBetween(value.startDate, value.endDate) >= 0, {
    message: "The last day is before the first day. Choose a later last day.",
    path: ["endDate"],
  })
  .refine((value) => daysBetween(value.startDate, value.endDate) + 1 <= MAX_TRIP_DAYS, {
    message: `A trip runs to ${String(MAX_TRIP_DAYS)} days at most. Choose an earlier last day.`,
    path: ["endDate"],
  });

export type TripSettings = z.infer<typeof tripSettingsSchema>;
