"use client";

import { useActionState, useId, useState } from "react";
import type { IsoDate } from "@/core/model/day";
import { addDays, daysBetween } from "@/core/time/zoned";
import { DateRangeField, DateRangeWaiting } from "@/features/trip-settings/date-range-field";
import { PlaneIcon } from "@/ui/icons";
import { useLocalToday } from "@/ui/use-local-today";
import { MAX_TRIP_DAYS } from "@/core/model/trip";
import type { ChosenPlace } from "./place-field";
import { PlaceField } from "./place-field";
import { createTripAction } from "./create-trip-action";
import type { CreateTripFormState } from "./create-trip-action";
import { FIELD_LABEL } from "./field-styles";
import { Notice } from "@/ui/notice";
import "./create-trip-form.css";

// Lives here, not beside the action: a "use server" file may export only async
// functions, so the starting state cannot sit next to it.
const NO_ERROR: CreateTripFormState = { error: null, field: null };

/**
 * How far the last day sits from the first when the form opens. Four, not five:
 * both ends are counted, so this is a trip of five days.
 */
const OPENING_SPAN_DAYS = 4;

export function CreateTripForm() {
  const [state, submit, pending] = useActionState(createTripAction, NO_ERROR);
  /**
   * Today on the reader's own clock: the day the form opens on, the earliest
   * it offers, and the day the calendar rings. Read in the browser, because
   * the page is built once and served as it is to every zone, and null for
   * the moment before the browser has said, while the field waits for it.
   */
  const today = useLocalToday();
  /**
   * The two ends the reader chose, held together so the last day can travel
   * with the first, or null until they choose. Only the calendar writes them,
   * so they are always real dates, and the server checks the pair again
   * anyway. Until then the trip opens on today and runs five days.
   */
  const [chosen, setChosen] = useState<{ readonly start: IsoDate; readonly end: IsoDate } | null>(
    null,
  );
  const [city, setCity] = useState<ChosenPlace | null>(null);
  /**
   * The answer the city was last changed under. An answer saying the city is
   * missing is about the form as it was sent, and the moment the city is
   * touched the form is no longer that one: left up, the sentence stands
   * beside a chosen city saying there is none. Held as the answer itself
   * rather than as a flag, so the next answer arrives fresh without an
   * effect to clear anything.
   */
  const [cityChangedUnder, setCityChangedUnder] = useState<CreateTripFormState | null>(null);
  const changeCity = (place: ChosenPlace | null): void => {
    setCity(place);
    setCityChangedUnder(state);
  };
  const error = state.field === "city" && cityChangedUnder === state ? null : state.error;
  /** How many days the trip runs, both ends counted, as the pill over the dates says it. */
  const days = chosen === null ? OPENING_SPAN_DAYS + 1 : daysBetween(chosen.start, chosen.end) + 1;
  const helperId = useId();

  return (
    // The room round it and between its questions are the page's on a desk,
    // where they come down in a shorter window, and the same at their most
    // otherwise. Wide and low: 500px, with every control 48px tall and its
    // words a step under v5's, where at v5's 540 by 400 it stood tall enough
    // to be the largest thing on the page after the headline, and at the
    // left column's 560 it read too wide. At 500 its fields keep the 400px
    // the dates need for 16px, which a card under 456 would not.
    <form
      action={submit}
      className="flex w-full max-w-[500px] flex-col gap-[var(--form-step,20px)] rounded-[28px] bg-paper-raised p-[var(--form-room,clamp(24px,4vw,28px))] shadow-md"
    >
      <div>
        <PlaceField
          id="cityPlaceId"
          name="cityPlaceId"
          label="First city"
          placeholder="Type the city"
          chosen={city}
          onChange={changeCity}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          {/* For the eye: the field names itself to a screen reader. */}
          <span aria-hidden="true" className={FIELD_LABEL}>
            Dates
          </span>
          <span
            role="status"
            className="flex h-6 items-center rounded-pill bg-sage-100 px-2.5 text-[12px] leading-none font-bold text-sage-800"
          >
            {`${String(days)} ${days === 1 ? "day" : "days"}`}
          </span>
        </div>
        {today === null ? (
          <DateRangeWaiting id="tripDates" label="Dates" />
        ) : (
          <DateRangeField
            id="tripDates"
            startName="startDate"
            endName="endDate"
            label="Dates"
            start={chosen?.start ?? today}
            end={chosen?.end ?? addDays(today, OPENING_SPAN_DAYS)}
            today={today}
            min={today}
            maxSpanDays={MAX_TRIP_DAYS}
            size="large"
            onChange={setChosen}
          />
        )}
      </div>

      {error === null ? null : (
        <Notice role="alert" size="small">
          {error}
        </Notice>
      )}

      {/* Not open to a press until there is a city and the dates are there
          to send, with the line under it saying which is still to come. The
          page is served without the dates, and a form sent before the
          browser has said what today is would come back saying the first day
          is missing, with nowhere yet to enter one. Until then it stands in
          the warm grey a control that is not ready takes, its words in the
          muted ink, 4.9:1 from it, so it reads as waiting and is still read:
          faded, its words stood 1.7:1. Making the trip, it is shut to a
          second press without that grey, as it is busy, not out of reach.
          Its words are 20px and bold, which is large type by WCAG's count,
          from 18.67px: light words on the accent stand 3.5:1 from it, enough
          for large type, which DESIGN.md tunes the accent for, and short of
          the 4.5:1 smaller words would need. How its plane moves, under the
          pointer and while the trip is being made, is in
          create-trip-form.css. */}
      <div className="flex flex-col gap-3 pt-1">
        <button
          type="submit"
          disabled={pending || today === null || city === null}
          data-pending={pending || undefined}
          aria-describedby={helperId}
          className={`start-go flex h-12 w-full items-center justify-center rounded-pill bg-terracotta px-6 font-body text-[20px] leading-none font-bold text-sheet enabled:hover:bg-terracotta-600 enabled:active:bg-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${
            pending ? "cursor-progress" : "disabled:bg-neutral-300 disabled:text-ink-muted"
          }`}
        >
          {/* Laid out as Start planning whichever words are showing, so the
              plane flies off from where it stood rather than jumping as the
              words change. Making the trip is the wider, and is laid over
              the same place from its right-hand end. On one line always: on
              the narrowest phone the words and the plane come to more than
              the room inside the button, and run on into its sides rather
              than breaking, which stood Making the trip at the button's top. */}
          <span className="relative whitespace-nowrap">
            <span className={pending ? "invisible" : undefined}>Start planning</span>
            {pending ? (
              <span className="absolute top-0 right-0 whitespace-nowrap">Making the trip</span>
            ) : null}
          </span>
          {/* The one plane either way, so a press sends it off from where it
              stood rather than putting another in its place. */}
          <span aria-hidden="true" className="start-go-runway">
            <PlaneIcon size={16} strokeWidth={2.75} className="start-go-plane" />
          </span>
        </button>
        <p
          id={helperId}
          className="text-center text-[13px] leading-normal font-medium text-balance text-ink-muted"
        >
          {city === null
            ? "Type your first city to begin. You can add more cities next."
            : "Next, add more cities and fill each day."}
        </p>
      </div>
    </form>
  );
}
