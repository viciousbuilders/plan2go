"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";
import type { Conflict } from "@/core/model/conflict";
import { conflictsAtStop } from "@/core/model/conflict";
import type { DayEndpoint, DayPlan } from "@/core/model/day";
import type { ComputedDay, ComputedStop } from "@/core/time/compute-day";
import { formatClock, formatDuration } from "@/core/time/minutes";
import { ClockIcon, NoteIcon } from "@/ui/icons";
import type { PlannedDay } from "../compute-trip";
import { ConflictNotice } from "../conflict-notice";
import type { DayActions } from "../day-actions";
import { ENDS, MARKS } from "../day-ends";
import type { EndpointRef } from "../day-itinerary";
import { formatDayTime } from "../format-day-time";
import { hoursOn } from "../format-opening-hours";
import { LeaveAt } from "../leave-at";
import { RAIL_END_MARK, RAIL_MARK, RAIL_ROW } from "./rail";
import { TimelineLeg } from "./timeline-leg";

interface DayTimelineProps {
  readonly day: DayPlan;
  readonly computed: ComputedDay;
  /** Every leg with the ways of covering it. In the computed legs' order. */
  readonly legs: PlannedDay["legs"];
  /** A stop opened to see what the place is like, and to change it there. */
  readonly onOpenStop: (stopId: string) => void;
  /** One end of the day opened the same way. */
  readonly onOpenEndpoint: (endpoint: EndpointRef) => void;
  /** Null for a reader who holds no edit token. */
  readonly actions: DayActions | null;
  /** Takes the traveller to the search for the next place. Null for a reader who cannot edit. */
  readonly onFindPlace: (() => void) | null;
  /** Takes the traveller to the same search for one end of the day. Null for a reader who cannot edit. */
  readonly onFindEnd: ((which: "start" | "end") => void) | null;
}

/** What the line for each end of the day says it does there. */
function endVerb(which: "start" | "end", day: DayPlan): string {
  if (which === "start") {
    return "Leave";
  }
  const back = day.start !== null && day.end !== null && day.start.place.id === day.end.place.id;
  return back ? "Back at" : "Finish at";
}

/**
 * One end of the day on the rail, laid out as a stop is: the time the day
 * passes it in the column of times, the end's marker with its glyph on the
 * rail, and beside them a card with what the day does there, "Leave The Old
 * Clare Hotel", as design 1b writes the start. When the place keeps hours
 * they are under the words, since a hotel that locks its doors at eleven is
 * as much use to know about as a museum that shuts at five.
 *
 * The card is a desk's row for an end: paper inside a hairline at the row
 * radius, a step under the raised cards the stops are on, since the day
 * passes through an end rather than spending time there, and as deep as what
 * is in it and 9px more over and under, as a desk's is. The time and the
 * marker stand level with its middle, as they stood with the words before
 * there was a card, and the thread runs on to the marker from the leg above
 * it and away from it down the leg below. The whole card is one button that
 * opens the place, where the end is taken off the day, as a stop is from its
 * own: on a phone the day is read here and changed there, and an end is
 * changed as a stop is, taken off and another found. Under a pointer it
 * sinks as a desk's row does, inside an edge of sage.
 *
 * Without an end, someone who may edit is offered one as a desk offers it, on
 * the same card drawn dashed, beside the marker it will get: the name of the
 * end and what kind of place goes there. It takes them to the search on the
 * map, as "Add a place" does, which finds the end as it finds a place.
 *
 * The start's time is when the day leaves, which for someone who may edit is
 * the pill that sets it.
 */
function EndLine({
  which,
  day,
  endpoint,
  time,
  setTime,
  reached,
  goesOn,
  onFind,
  onOpen,
}: {
  readonly which: "start" | "end";
  readonly day: DayPlan;
  readonly endpoint: DayEndpoint | null;
  /** When the day passes this end, or null when that could not be worked out. */
  readonly time: string | null;
  /** Sets the time rather than reading it; null wherever it is only read. */
  readonly setTime: ReactNode;
  /** Whether a leg comes down the rail to it, which the end of a day has after its stops. */
  readonly reached: boolean;
  /** Whether a leg goes on down the rail from it, which the start of a day has before its stops. */
  readonly goesOn: boolean;
  /** Takes the reader to the search for this end. Null for a reader who cannot edit. */
  readonly onFind: (() => void) | null;
  readonly onOpen: (endpoint: EndpointRef) => void;
}) {
  const words = ENDS[which];
  const Mark = MARKS[which];
  /**
   * One marker for the line with the place and the line offering one, so the
   * offer shows the shape the end will get.
   */
  const mark = (
    <span className={RAIL_END_MARK}>
      <Mark size={13} strokeWidth={2.75} />
    </span>
  );

  if (endpoint === null) {
    /* Twelve from what is next to it on the day's side, as a desk's offer
       keeps, since a card stands there. The marker and the card are one
       button, as the next place's circle and card are, and the ring that
       shows the keyboard is on it is drawn round the card. */
    return onFind === null ? null : (
      <div className={`${RAIL_ROW} ${which === "start" ? "pb-3" : "pt-3"}`}>
        <span aria-hidden="true" />
        <button
          type="button"
          onClick={onFind}
          className="group/end col-span-2 grid grid-cols-[26px_minmax(0,1fr)] items-center gap-x-[10px] text-left focus-visible:outline-none"
        >
          {mark}
          <span className="flex min-h-11 flex-col justify-center rounded-row border-[1.5px] border-dashed border-rule-strong bg-paper px-[15.5px] py-[8.5px] group-hover/end:border-terracotta group-hover/end:bg-paper-raised group-focus-visible/end:outline-2 group-focus-visible/end:outline-offset-2 group-focus-visible/end:outline-terracotta">
            <span className="block text-small/[1.15] font-semibold text-sage-800">{words.add}</span>
            <span className="mt-[3px] block text-micro/[1.25] text-ink-muted">{words.hint}</span>
          </span>
        </button>
      </div>
    );
  }

  const hours = hoursOn(endpoint.place, day);
  return (
    /* Twelve over an end no leg comes down to, from what stands above it. */
    <div className={`${RAIL_ROW} ${which === "end" && !reached ? "pt-3" : ""}`}>
      <div className="flex items-center justify-end">
        {setTime ?? (
          <p className="font-display text-time whitespace-nowrap text-ink tabular-nums">{time}</p>
        )}
      </div>
      <div aria-hidden="true" className="flex flex-col items-center">
        <span className={`mb-1 flex-1 ${reached ? "thread" : ""}`} />
        {mark}
        <span className={`mt-1 flex-1 ${goesOn ? "thread" : ""}`} />
      </div>
      <div
        className={`relative min-w-0 rounded-row border border-rule bg-paper px-4 py-[9px] hover:border-sage-600/55 hover:bg-paper-sunken`}
      >
        <button
          type="button"
          onClick={() => {
            onOpen({ dayId: day.id, which, placeId: endpoint.place.id });
          }}
          className="flex w-full flex-col text-left after:absolute after:-inset-px after:rounded-row focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-terracotta"
        >
          <span className="block text-body/[1.3] font-semibold break-words text-ink">
            {`${endVerb(which, day)} ${endpoint.place.name}`}
          </span>
          {hours === null ? null : (
            <span className="mt-[3px] flex items-center gap-[5px] text-micro text-ink-muted tabular-nums">
              <ClockIcon size={12} className="shrink-0" />
              {hours}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * A stop on the rail, as design 1b draws it. In the column of times, when it
 * is reached, in the display face, over when it is left, small and quiet; on
 * the rail, its number on a terracotta disc with the dotted thread running on
 * down from it, as a desk draws it, so the day hangs on one line from the
 * first stop to the last rather than a line of the accent broken by a dotted
 * one at every leg; and beside them, on a card as a desk's stop is, its name
 * in the display face, its address, and how long is spent there, in the
 * accent's brown.
 *
 * The whole card is one button that opens the place, where the stay, the
 * note and the stop's place in the day are changed and the stop is taken off:
 * on a phone the day is read here and changed there. What the day has to say
 * about the stop stays on the card under the words, a conflict with its
 * numbers in it, and the note for whoever is travelling.
 */
function TimelineStop({
  position,
  stop,
  address,
  note,
  conflicts,
  leaveAt,
  reached,
  onOpen,
}: {
  /** Its number in the day, counted from one. */
  readonly position: number;
  readonly stop: ComputedStop;
  readonly address: string | null;
  readonly note: string | null;
  readonly conflicts: readonly Conflict[];
  /**
   * What sets the day's leaving time, in place of this stop's arrival: the
   * first stop of a day with no start point, whose arrival is when the day
   * leaves, for someone who may edit. Null on every other stop.
   */
  readonly leaveAt: ReactNode;
  /**
   * Whether a leg comes down the rail to it, which every stop has but the
   * first of a day with no start point.
   */
  readonly reached: boolean;
  readonly onOpen: () => void;
}) {
  return (
    <div className={RAIL_ROW}>
      {/* The time and the disc stand as far down as the card's edge and
          padding put the name, so the three read as one line, as they did
          before the card; the thread runs on to the disc from the leg above,
          one dot as clear of it as the thread under it is. */}
      <div className="flex flex-col items-end pt-[15px] text-right">
        {leaveAt ??
          (stop.arrival === null ? null : (
            <p className="font-display text-place/[1.1] font-semibold text-ink tabular-nums">
              {formatDayTime(stop.arrival)}
            </p>
          ))}
        {stop.departure === null ? null : (
          <p className="mt-[6px] text-micro/[1.2] font-medium text-ink-faint tabular-nums">
            <span className="sr-only">to </span>
            {formatDayTime(stop.departure)}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center pt-1">
        <span aria-hidden="true" className={`h-1 ${reached ? "thread" : ""}`} />
        <span
          className={`${RAIL_MARK} mt-1 bg-terracotta font-display text-meta/none font-semibold text-paper tabular-nums`}
        >
          <span aria-hidden="true">{position}</span>
          <span className="sr-only">Stop {position}</span>
        </span>
        <span aria-hidden="true" className="thread mt-1 flex-1" />
      </div>

      {/* The card is a desk's stop card's surface, edge, corners and padding,
          and sinks under a pointer as that card does. The button is the words,
          and its press, and the ring that shows it has the keyboard, reach to
          the card's edge, so a finger anywhere on the card opens the place. */}
      <div className="relative flex min-w-0 flex-col gap-2 rounded-row border border-rule bg-paper-raised px-4 py-[13px] hover:border-terracotta/55 hover:bg-paper-sunken">
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-col gap-1 text-left after:absolute after:-inset-px after:rounded-row focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-terracotta"
        >
          <span className="font-display text-lead break-words text-ink">{stop.placeName}</span>
          {address === null ? null : (
            <span className="text-meta break-words text-ink-muted">{address}</span>
          )}
          <span className="mt-1 text-meta/none font-semibold text-terracotta-800 tabular-nums">
            {`${formatDuration(stop.stayMinutes)} here`}
          </span>
        </button>
        {conflicts.map((conflict, at) => (
          <ConflictNotice key={`${conflict.kind}-${String(at)}`} conflict={conflict} />
        ))}
        {note === null ? null : (
          <p className="flex items-start gap-[6px] text-meta whitespace-pre-line text-ink-muted">
            <NoteIcon size={13} className="mt-[3px] shrink-0" />
            <span className="sr-only">Note: </span>
            {note}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * The day as a phone reads it, top to bottom, down the rail design 1b of
 * "PlanToGo iPhone" draws: where it starts if it starts anywhere, every leg
 * and every stop in order, and where it ends if it ends anywhere. After the
 * last stop, for someone who may edit, the next place, as a dashed circle on
 * the rail with its number in it and "Add a place" on a card beside it, which
 * is where a place found in the search goes.
 *
 * A desk draws the same day in day-itinerary, with every control on its
 * cards; the two are the same day and the same actions, laid out for the room
 * each has.
 */
export function DayTimeline({
  day,
  computed,
  legs,
  onOpenStop,
  onOpenEndpoint,
  actions,
  onFindPlace,
  onFindEnd,
}: DayTimelineProps) {
  /**
   * When the day leaves, set where that time shows: on the start point's
   * time when the day has one, and otherwise on the first stop's arrival.
   * Keyed by the day, so a time half chosen on one day is not carried to the
   * next. Its picker hangs from its left, into the window, from the column
   * of times at the window's left edge.
   */
  const leaveAt =
    actions === null ? null : (
      <LeaveAt
        key={day.id}
        value={day.startAtMinutes}
        clock={formatClock(computed.begins.minutesFromMidnight)}
        onChoose={(startAtMinutes) => actions.setDayStart({ startAtMinutes })}
        align="left"
        compact
      />
    );

  const stops = new Map(day.stops.map((stop) => [stop.id, stop]));
  /** With no start point the first stop has no leg arriving at it. */
  const legOffset = day.start === null ? -1 : 0;
  const legToEnd = day.end === null ? undefined : computed.legs[computed.legs.length - 1];
  const plannedToEnd = legToEnd === undefined ? undefined : legs[legToEnd.index];
  const changeLeg = actions === null ? null : actions.changeLegMode;
  /** The last stop on the day, which the next one would come after. */
  const last = computed.stops[computed.stops.length - 1];
  /** When the way on to the next place would begin: when the last stop is left. */
  const onFrom = last === undefined || last.departure === null ? null : formatDayTime(last.departure);

  return (
    <div>
      <EndLine
        which="start"
        day={day}
        endpoint={day.start}
        time={formatClock(computed.begins.minutesFromMidnight)}
        setTime={leaveAt}
        reached={false}
        goesOn={day.stops.length > 0}
        onFind={
          onFindEnd === null
            ? null
            : () => {
                onFindEnd("start");
              }
        }
        onOpen={onOpenEndpoint}
      />

      {/* Nothing planned: on the rail, as everything else on the day is, the
          way a desk says it. The line the stops will hang on runs down the
          marks' column, dashed in the accent because nothing hangs on it
          yet, and stops short of the ends' markers; the words are set left
          in the words' column, with the way to the first place under them
          for someone who may edit, in the accent's solid pill since it is
          the one thing to do. */}
      {day.stops.length === 0 ? (
        <div className={`${RAIL_ROW} py-1.5`}>
          <span aria-hidden="true" />
          <span aria-hidden="true" className="thread-waiting justify-self-center" />
          <div className="flex min-w-0 flex-col items-start py-3">
            <p className="font-display text-lead text-balance text-ink">Nothing planned yet</p>
            {onFindPlace === null ? null : (
              <button
                type="button"
                onClick={onFindPlace}
                className="mt-[14px] flex h-12 items-center rounded-pill bg-terracotta px-[22px] font-display text-place/none font-semibold text-paper hover:bg-terracotta-600 active:bg-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
                Add a place
              </button>
            )}
          </div>
        </div>
      ) : null}

      {computed.stops.map((stop, index) => {
        const leg = computed.legs[index + legOffset];
        const planned = leg === undefined ? undefined : legs[leg.index];
        const plan = stops.get(stop.stopId);
        const reached = leg !== undefined && planned !== undefined;
        return (
          <Fragment key={stop.stopId}>
            {reached ? <TimelineLeg leg={leg} planned={planned} onChange={changeLeg} /> : null}
            <TimelineStop
              position={index + 1}
              stop={stop}
              address={plan?.place.address ?? null}
              note={plan?.note ?? null}
              conflicts={conflictsAtStop(computed.conflicts, stop.stopId)}
              leaveAt={index === 0 && day.start === null ? leaveAt : null}
              reached={reached}
              onOpen={() => {
                onOpenStop(stop.stopId);
              }}
            />
          </Fragment>
        );
      })}

      {/* The next stop, where it would go, laid out as a stop is: a dashed
          circle of the accent on the rail under the last disc, with the
          number that stop would get in it, as a desk's has, in the discs' face
          and step; and beside it, on a card of the stops' surface and edge,
          the words, in the accent's brown at the weight design 1b gives them,
          the brown the number takes too. The card is one line deep and a
          finger's height, 12px under the last stop's card, and the circle is
          level with it; the thread runs on to the circle from the last disc,
          its last dot as clear of it as of a disc. The circle and the card are
          one button, so the whole of the line can be pressed. Under a pointer
          the card sinks as a stop's does and the circle's dash takes the
          whole accent, and the ring that shows the keyboard is on it is drawn
          round the card, as a stop's is.

          In the column of times, level with the card, "from" and when the
          last stop is left, as a desk's card says it: when the way to the
          next place would begin, not when that place would start, since the
          leg between them comes first. At the step, the weight and the ink of
          the stops' leaving times above it, and set to the column's right
          edge as they are, a word to a line where the column is too narrow
          for the two. It is in the button's name, so it is read once. */}
      {onFindPlace === null || day.stops.length === 0 ? null : (
        <div className={RAIL_ROW}>
          <p
            aria-hidden="true"
            className="flex flex-col justify-center pt-3 text-right text-micro/[1.2] font-medium text-ink-faint tabular-nums"
          >
            {onFrom === null ? null : `from ${onFrom}`}
          </p>
          <button
            type="button"
            onClick={onFindPlace}
            aria-label={
              onFrom === null || last === undefined
                ? `Add a place as stop ${String(day.stops.length + 1)}`
                : `Add a place as stop ${String(day.stops.length + 1)}, after leaving ${last.placeName} at ${onFrom}`
            }
            className="group/next col-span-2 grid grid-cols-[26px_minmax(0,1fr)] gap-x-[10px] text-left focus-visible:outline-none"
          >
            <span aria-hidden="true" className="flex flex-col items-center pt-1">
              <span className="thread h-[13px]" />
              <span
                className={`${RAIL_MARK} mt-1 border-2 border-dashed border-terracotta/60 font-display text-meta/none font-semibold text-terracotta-800 tabular-nums group-hover/next:border-terracotta`}
              >
                {day.stops.length + 1}
              </span>
            </span>
            <span className="mt-3 flex min-h-11 items-center rounded-row border border-rule bg-paper-raised px-4 group-hover/next:border-terracotta/55 group-hover/next:bg-paper-sunken group-focus-visible/next:outline-2 group-focus-visible/next:outline-offset-2 group-focus-visible/next:outline-terracotta">
              <span className="text-body/none font-bold text-terracotta-800">Add a place</span>
            </span>
          </button>
        </div>
      )}

      {legToEnd === undefined || plannedToEnd === undefined ? null : (
        <TimelineLeg leg={legToEnd} planned={plannedToEnd} onChange={changeLeg} />
      )}

      <EndLine
        which="end"
        day={day}
        endpoint={day.end}
        time={computed.ends === null ? null : formatDayTime(computed.ends)}
        setTime={null}
        reached={legToEnd !== undefined && plannedToEnd !== undefined}
        goesOn={false}
        onFind={
          onFindEnd === null
            ? null
            : () => {
                onFindEnd("end");
              }
        }
        onOpen={onOpenEndpoint}
      />
    </div>
  );
}
