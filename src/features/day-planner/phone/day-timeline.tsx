"use client";

import type { MouseEvent, ReactNode } from "react";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { Conflict } from "@/core/model/conflict";
import { conflictsAtStop } from "@/core/model/conflict";
import type { DayEndpoint, DayPlan } from "@/core/model/day";
import type { ComputedDay, ComputedStop } from "@/core/time/compute-day";
import { formatClock } from "@/core/time/minutes";
import { NoteIcon, PlusIcon, SearchIcon } from "@/ui/icons";
import type { PlannedDay } from "../compute-trip";
import { ConflictNotice } from "../conflict-notice";
import type { DayActions } from "../day-actions";
import { ENDS, MARKS } from "../day-ends";
import type { EndpointRef } from "../day-itinerary";
import { movedWithin } from "../day-order";
import { formatDayDate } from "../format-day-date";
import { formatDayTime } from "../format-day-time";
import { LeaveAt } from "../leave-at";
import { Notice } from "@/ui/notice";
import { TimelineLeg } from "./timeline-leg";
import type { StopCarry } from "./use-stop-carry";
import { useStopCarry } from "./use-stop-carry";

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
  /**
   * Tells the planner a stop has been picked up to go to another day, or put
   * back. Null when no stop can go anywhere: for a reader, and on a trip of
   * one day.
   */
  readonly onCarry: ((stopId: string | null) => void) | null;
  /** A stop let go on another day and on its way there, which this day no longer shows. */
  readonly leaving: string | null;
  /** Why the last stop let go on another day did not go, or null. */
  readonly leaveError: string | null;
  /** Whether the day is changing places with another, and waiting on its times for its new date. */
  readonly rearranging: boolean;
}

/** What the day does at each end, read out before the place's name. */
function endVerb(which: "start" | "end", day: DayPlan): string {
  if (which === "start") {
    return "Leave";
  }
  const back = day.start !== null && day.end !== null && day.start.place.id === day.end.place.id;
  return back ? "Back at" : "Finish at";
}

/**
 * The column a time stands in, on every line of a phone's day that has one: a
 * stop's block of times, the next place's, and an end's pill. Each starts it
 * 10px in and puts the words 14px after it, so the day's times stand in one
 * column and its names in another. 74px is the pill that sets when the day
 * leaves, the widest thing ever put in it, with the time bold at the place
 * step as every time on the day is.
 */
const TIME_COLUMN = "min-w-[74px]";

/**
 * The shape both of an end's pills share: 48px tall and rounded to half that,
 * so one line is a pill and a name long enough for two makes a card with the
 * same round ends.
 */
const END_PILL = "relative flex min-h-12 w-full items-center rounded-[24px] text-left";

/**
 * An end of the day that is there, as the phone's day design draws it: a pill
 * of sage 200 with no glyph on it, when the day passes the end at its left in
 * sage 800, bold at the place step as every time on the day is, and the
 * place's name after it in sage 900, in the display face at the anchor step,
 * a step under a stop's name, with its address under it at the small step in
 * sage 800, as a stop's address is under its name. The time stands in the
 * day's column of times and the name where a stop's name starts, so the day's
 * times stand in one column and its names in another, ends and stops alike. At
 * the start the time is when the day leaves, which for someone who may edit is
 * the time and chevron that set it, with no edge, in the same column.
 *
 * What the day does there, "Leave", "Finish at", "Back at", is read out before
 * the name rather than drawn. The whole pill opens the place, where the end is
 * changed for another or taken off the day: on a phone the day is read here
 * and changed there. Under a pointer an edge of sage 600 at 55 percent comes
 * round it, as round a desk's row.
 */
function EndPill({
  which,
  day,
  endpoint,
  time,
  setTime,
  onOpen,
}: {
  readonly which: "start" | "end";
  readonly day: DayPlan;
  readonly endpoint: DayEndpoint;
  /** When the day passes this end, or null when that could not be worked out. */
  readonly time: string | null;
  /** Sets the time rather than reading it; null wherever it is only read. */
  readonly setTime: ReactNode;
  readonly onOpen: (endpoint: EndpointRef) => void;
}) {
  return (
    /* The edge is a pixel of the padding a stop card has, so the column of
       times starts 10px in, where a stop's block does. */
    <div
      className={`${END_PILL} gap-3.5 border border-transparent bg-sage-200 py-2 pr-4 pl-[9px] hover:border-sage-600/55`}
    >
      {/* Over the button's reach when it holds the pill that sets the time,
          so that pill is pressed and not the place behind it. */}
      <div
        className={`flex ${TIME_COLUMN} shrink-0 justify-center ${setTime === null ? "" : "relative z-[1]"}`}
      >
        {setTime ??
          (time === null ? null : (
            <p className="text-place/none font-bold whitespace-nowrap text-sage-800 tabular-nums">
              {time}
            </p>
          ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onOpen({ dayId: day.id, which, placeId: endpoint.place.id });
        }}
        className="flex min-w-0 flex-1 flex-col gap-1 text-left after:absolute after:-inset-px after:rounded-[24px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-terracotta"
      >
        <span className="font-display text-anchor break-words text-sage-900">
          <span className="sr-only">{`${endVerb(which, day)} `}</span>
          {endpoint.place.name}
        </span>
        {endpoint.place.address === null ? null : (
          <span className="text-small break-words text-sage-800">{endpoint.place.address}</span>
        )}
      </button>
    </div>
  );
}

/**
 * An end of the day not there yet, offered to someone who may edit: the same
 * pill drawn dashed, 1.5px of sage 400 on paper, the end's disc in sage 200
 * with its glyph in sage 700, the house where the day would set out or the
 * flag where it would finish, its middle 24px in, on the thread, as a leg's
 * disc's is; then the end it offers in bold sage 800, and a plus in sage 600
 * at the right end. It takes them to the search on the map, as "Add a place"
 * does, which finds the end as it finds a place.
 */
function EndOffer({
  which,
  onFind,
}: {
  readonly which: "start" | "end";
  readonly onFind: () => void;
}) {
  const Mark = MARKS[which];
  return (
    <button
      type="button"
      onClick={onFind}
      className={`${END_PILL} gap-3 border-[1.5px] border-dashed border-sage-400 bg-paper py-[6.5px] pr-5 pl-[6.5px] hover:border-sage-600 hover:bg-paper-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta`}
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-pill bg-sage-200 text-sage-700"
      >
        <Mark size={14} strokeWidth={2.75} />
      </span>
      <span className="min-w-0 flex-1 text-place/none font-bold text-sage-800">
        {ENDS[which].add}
      </span>
      <PlusIcon size={16} strokeWidth={2.75} className="shrink-0 text-sage-600" />
    </button>
  );
}

/**
 * How a stop's card stands while a stop is carried on the day: as it always
 * is; offered as somewhere to let the carried stop go; the one under the
 * finger, where letting go puts it; the carried stop's own place, which the
 * card keeps with nothing on it; or the picture of the carried stop, drawn
 * wherever the finger has taken it.
 */
type StopLook = "rest" | "offered" | "over" | "left" | "picture";

/**
 * A card's ground and edges in each look. Offered, dashed in the dashed
 * outlines' own ink, and under the finger dashed in the accent over the step
 * a card takes under a pointer, as a day in the strip is offered to a carried
 * stop, so a place in the day and a day are offered alike. The carried stop's
 * own place keeps its raised paper and shadow with nothing on it, the empty
 * card a carried day leaves in the strip. Its picture is lifted onto the
 * shadow of what floats; how faint it is is the picture's frame's to say.
 */
const STOP_LOOK: Readonly<Record<StopLook, string>> = {
  rest: "bg-paper-raised shadow-sm hover:bg-paper-sunken",
  offered:
    "bg-paper-raised shadow-sm outline-[1.5px] outline-offset-2 outline-dashed outline-rule-strong",
  over: "bg-paper-sunken shadow-sm outline-2 outline-offset-2 outline-dashed outline-terracotta",
  left: "bg-paper-raised shadow-sm *:opacity-0",
  picture: "bg-paper-raised shadow-md",
};

/** What a stop's card answers a press with while stops can be carried. */
type StopHandlers = ReturnType<StopCarry["handlers"]>;

/**
 * A stop, as the phone's day design draws it: a card of raised paper at the
 * row radius under the small shadow, full width, with no number on it. At its
 * left, on a block of terracotta 100 as tall as the card less its padding,
 * when the stop is reached in bold terracotta 800 over when it is left, "to
 * 10:14", smaller in terracotta 700; then the place's name in the display face
 * over its address in neutral 700. With no start point, for someone who may
 * edit, the first stop's arrival is when the day leaves, and the time and
 * chevron that set it stand in the block in place of the time.
 *
 * The whole card is one button that opens the place, where the stay, the note
 * and the stop's place in the day are changed and the stop is taken off: on a
 * phone the day is read here and changed there. What the day has to say about
 * the stop stays on the card under the words, a conflict with its numbers in
 * it, and the note for whoever is travelling.
 *
 * Held, as a day in the strip is held, it is carried along the day or onto
 * another day (see useStopCarry). Drawn as its picture, it is the same card
 * with nothing to press and nothing read out.
 */
function TimelineStop({
  position,
  stop,
  address,
  note,
  conflicts,
  leaveAt,
  at,
  look,
  holdable,
  handlers,
  onOpen,
}: {
  /** Its number in the day, counted from one, read out before its name. */
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
  /** Its place in the day as shown, by which a carried stop finds it. Null for the picture. */
  readonly at: number | null;
  readonly look: StopLook;
  /** Whether it can be held and carried, which keeps the phone's own long press, its menu and the words it would pick out, from answering instead. */
  readonly holdable: boolean;
  readonly handlers: StopHandlers;
  /** Opens the place. Null for the picture, which opens nothing. */
  readonly onOpen: ((event: MouseEvent<HTMLButtonElement>) => void) | null;
}) {
  const times = leaveAt !== null || stop.arrival !== null;
  const words = (
    <>
      <span className="sr-only">{`Stop ${String(position)}, `}</span>
      <span className="font-display text-lead break-words text-ink">{stop.placeName}</span>
      {address === null ? null : (
        <span className="text-small break-words text-neutral-700">{address}</span>
      )}
    </>
  );
  return (
    <div
      data-stop-at={at ?? undefined}
      aria-hidden={look === "picture" ? true : undefined}
      className={`relative flex gap-3.5 rounded-row py-2 pr-4 pl-2.5 ${
        holdable ? "select-none [-webkit-touch-callout:none]" : ""
      } ${STOP_LOOK[look]}`}
    >
      {times ? (
        /* Over the button's reach only when it holds the pill that sets the
           time; otherwise a press on the times opens the place too. That
           control, the time and its chevron, is as wide as the block, so the
           block keeps 2px either side of it rather than 8, and stands within
           3px of the others' width, the names beside them on one edge. */
        <div
          className={`flex ${TIME_COLUMN} shrink-0 flex-col items-center justify-center gap-1 rounded-chip bg-terracotta-100 py-2.5 text-center tabular-nums ${
            leaveAt === null ? "px-2" : "relative z-[1] px-0.5"
          }`}
        >
          {leaveAt ??
            (stop.arrival === null ? null : (
              <p className="text-place/none font-bold text-terracotta-800">
                {formatDayTime(stop.arrival)}
              </p>
            ))}
          {stop.departure === null ? null : (
            <p className="text-meta/none font-semibold whitespace-nowrap text-terracotta-700">
              {`to ${formatDayTime(stop.departure)}`}
            </p>
          )}
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-1.5">
        {onOpen === null ? (
          <div className="flex flex-col gap-1">{words}</div>
        ) : (
          <button
            type="button"
            {...handlers}
            onClick={onOpen}
            className="flex flex-col gap-1 text-left after:absolute after:inset-0 after:rounded-row focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-terracotta"
          >
            {words}
          </button>
        )}
        {conflicts.map((conflict, index) => (
          <ConflictNotice key={`${conflict.kind}-${String(index)}`} conflict={conflict} />
        ))}
        {note === null ? null : (
          <p className="flex items-start gap-[6px] text-small whitespace-pre-line text-neutral-700">
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
 * The next place, after the last stop, for someone who may edit, laid out as
 * a stop's card is, so it reads as the slot the next stop would take: the
 * card's shape and padding, terracotta 100 inside a 1.5px dashed edge of
 * terracotta 400, flat where a stop's card is raised. At its left a stop's
 * block of times, in terracotta 200 so it shows on the 100 around it, "from"
 * over when the last stop is left, which is when the way to the next place
 * would begin, as the foot of a desk's last card says it; then, where a
 * stop's name stands, "Add a place" in bold terracotta 700, with a plus in the
 * same at the card's right end. The border is outside a stop card's padding,
 * so the block and the words stand on the stops' own edges. Under a pointer
 * the dash takes the whole accent.
 */
function NextPlace({
  number,
  after,
  from,
  onFind,
}: {
  /** The number the next stop would get. */
  readonly number: number;
  /** The stop it would come after, and when that stop is left, when both are known. */
  readonly after: string | null;
  readonly from: string | null;
  readonly onFind: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onFind}
      aria-label={
        from === null || after === null
          ? `Add a place as stop ${String(number)}`
          : `Add a place as stop ${String(number)}, after leaving ${after} at ${from}`
      }
      className="relative flex w-full gap-3.5 rounded-row border-[1.5px] border-dashed border-terracotta-400 bg-terracotta-100 py-[6.5px] pr-[14.5px] pl-[8.5px] text-left hover:border-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      {from === null ? null : (
        <span
          aria-hidden="true"
          className={`flex ${TIME_COLUMN} shrink-0 flex-col items-center justify-center gap-1 rounded-chip bg-terracotta-200 px-2 py-2.5 text-center tabular-nums`}
        >
          <span className="text-meta/none font-semibold text-terracotta-700">from</span>
          <span className="text-place/none font-bold text-terracotta-800">{from}</span>
        </span>
      )}
      <span
        aria-hidden="true"
        className="flex min-h-[52px] min-w-0 flex-1 items-center gap-2.5 text-place/none font-bold text-terracotta-700"
      >
        Add a place
        <PlusIcon size={16} strokeWidth={2.75} className="ml-auto shrink-0" />
      </span>
    </button>
  );
}

/**
 * A day with no stops, between its ends, as a desk's empty day is: no card,
 * the day's thread dashed in the accent where its stops will hang (drawn with
 * the day's thread, below), and beside it, on the edge an end's offer starts
 * its words on, "Nothing planned for Wed, 2 Dec yet" in the display face at
 * the title step, where places come from at the body step in ink-muted, and
 * for someone who may edit the way to the search, the one thing to do: the
 * accent's solid pill with a magnifier and "Find a place". The ends keep the
 * twelve every line keeps from the next, and the words keep eighteen more
 * inside, thirty in all, as on a desk.
 */
function NothingPlanned({
  dayName,
  onFindPlace,
}: {
  /** The day as the tabs name it, so the heading says which day is empty. */
  readonly dayName: string;
  readonly onFindPlace: (() => void) | null;
}) {
  return (
    <div className="ml-[52px] flex flex-col items-start py-[18px]">
      <h2 className="font-display text-title text-balance text-ink">
        Nothing planned for {dayName} yet
      </h2>
      <p className="mt-[6px] max-w-[38ch] text-body text-pretty text-ink-muted">
        Search for a place, have a look at it, and add it to the day.
      </p>
      {onFindPlace === null ? null : (
        <button
          type="button"
          onClick={onFindPlace}
          className="mt-[14px] flex h-10 items-center gap-2 rounded-pill bg-terracotta px-5 text-small/none font-semibold text-paper hover:bg-terracotta-600 active:bg-terracotta-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          <SearchIcon size={14} strokeWidth={2.75} />
          Find a place
        </button>
      )}
    </div>
  );
}

/**
 * One thing down the day. A leg carries its own room above and below; two
 * things that do not are set apart by `gap`, twelve unless said otherwise.
 */
interface Line {
  readonly key: string;
  readonly node: ReactNode;
  readonly roomy: boolean;
  readonly gap?: string;
}

/**
 * The day as a phone reads it, top to bottom, as the phone's day design draws
 * it: where it starts if it starts anywhere, every leg and every stop in
 * order, and where it ends if it ends anywhere, one column the window's
 * width. A dotted thread runs down the left of it behind everything, its
 * middle 24px in, through the legs' discs and an offered end's, and shows in
 * the room between the cards. After the last stop, for someone who may edit,
 * the next place, which is where a place found in the search goes.
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
  onCarry,
  leaving,
  leaveError,
  rearranging,
}: DayTimelineProps) {
  const dayRef = useRef<HTMLDivElement | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moving, startMoving] = useTransition();
  /**
   * The order as it was let go, shown at once while the server works out the
   * times it comes to, as on a desk: the cards keep their old times until
   * then, and the real answer replaces it when it lands, or the old order
   * comes back if it was refused.
   */
  const [shownStops, reorderShown] = useOptimistic(
    computed.stops,
    (shown: readonly ComputedStop[], change: { readonly from: number; readonly to: number }) =>
      movedWithin(shown, change.from, change.to),
  );
  /**
   * The stops as shown: the order as it was let go, less a stop let go on
   * another day, which leaves this one at once while the server moves it and
   * works out both days' times, as on a desk. While either is being written,
   * or the day changes places with another, the day is busy: faded under the
   * line saying so, and nothing on it is picked up.
   */
  const listed = leaving === null ? shownStops : shownStops.filter((stop) => stop.stopId !== leaving);
  const busy = rearranging || leaving !== null || moving;

  /** Puts the stop carried from one place in the day in another, the stops between closing up. */
  const move = (from: number, to: number): void => {
    const carried = listed[from];
    if (actions === null || carried === undefined || from === to) {
      return;
    }
    setMoveError(null);
    startMoving(async () => {
      reorderShown({ from, to });
      const outcome = await actions.moveStop({ stopId: carried.stopId, toPosition: to });
      setMoveError(outcome.error);
    });
  };

  /**
   * A stop can be picked up by someone who may edit, while the day is not
   * busy, when there is somewhere for it to go: another place in the day, or
   * another day.
   */
  const ready = actions !== null && !busy && (listed.length > 1 || onCarry !== null);
  const carry = useStopCarry({
    day: dayRef,
    stopIds: listed.map((stop) => stop.stopId),
    ready,
    onCarry,
    onMove: move,
  });
  const lifted = carry.carried;
  /**
   * When the day leaves, set where that time shows: on the start point's
   * time when the day has one, and otherwise on the first stop's arrival.
   * Keyed by the day, so a time half chosen on one day is not carried to the
   * next. Its picker hangs from its left, into the window. The time and its
   * chevron with no edge, in sage on the start's sage pill, where its time is
   * the colour the end's time is, and in the accent on a stop's terracotta
   * block.
   */
  const leaveAt =
    actions === null ? null : (
      <LeaveAt
        key={day.id}
        value={day.startAtMinutes}
        clock={formatClock(computed.begins.minutesFromMidnight)}
        onChoose={(startAtMinutes) => actions.setDayStart({ startAtMinutes })}
        align="left"
        look={day.start === null ? "stop" : "start"}
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

  const lines: Line[] = [];

  if (day.start !== null) {
    lines.push({
      key: "start",
      roomy: false,
      node: (
        <EndPill
          which="start"
          day={day}
          endpoint={day.start}
          time={formatClock(computed.begins.minutesFromMidnight)}
          setTime={leaveAt}
          onOpen={onOpenEndpoint}
        />
      ),
    });
  } else if (onFindEnd !== null) {
    lines.push({
      key: "start",
      roomy: false,
      node: (
        <EndOffer
          which="start"
          onFind={() => {
            onFindEnd("start");
          }}
        />
      ),
    });
  }

  if (day.stops.length === 0) {
    lines.push({
      key: "nothing",
      roomy: false,
      node: <NothingPlanned dayName={formatDayDate(day.date)} onFindPlace={onFindPlace} />,
    });
  }

  /** What a stop's card says, the same on the card and on the picture of it being carried. */
  const faceOf = (stop: ComputedStop) => {
    const plan = stops.get(stop.stopId);
    return {
      stop,
      address: plan?.place.address ?? null,
      note: plan?.note ?? null,
      conflicts: conflictsAtStop(computed.conflicts, stop.stopId),
    };
  };

  listed.forEach((stop, index) => {
    const leg = computed.legs[index + legOffset];
    const planned = leg === undefined ? undefined : legs[leg.index];
    if (leg !== undefined && planned !== undefined) {
      lines.push({
        key: `leg-${String(leg.index)}`,
        roomy: true,
        node: <TimelineLeg leg={leg} planned={planned} onChange={changeLeg} />,
      });
    }
    const look: StopLook =
      lifted === null
        ? "rest"
        : lifted.index === index
          ? "left"
          : lifted.over === index
            ? "over"
            : "offered";
    lines.push({
      key: stop.stopId,
      roomy: false,
      node: (
        <TimelineStop
          position={index + 1}
          {...faceOf(stop)}
          leaveAt={index === 0 && day.start === null ? leaveAt : null}
          at={index}
          look={look}
          holdable={ready}
          handlers={carry.handlers(index)}
          // A press that carried the stop somewhere opens nothing.
          onOpen={(event) => {
            if (!carry.carriedClick(event)) {
              onOpenStop(stop.stopId);
            }
          }}
        />
      ),
    });
  });
  /** The stop being carried, for its picture, drawn wherever the finger has taken it. */
  const carriedStop = lifted === null ? undefined : listed[lifted.index];

  if (onFindPlace !== null && day.stops.length > 0) {
    lines.push({
      key: "next",
      roomy: false,
      gap: "mt-4",
      node: (
        <NextPlace
          number={day.stops.length + 1}
          after={last?.placeName ?? null}
          from={onFrom}
          onFind={onFindPlace}
        />
      ),
    });
  }

  if (legToEnd !== undefined && plannedToEnd !== undefined) {
    lines.push({
      key: `leg-${String(legToEnd.index)}`,
      roomy: true,
      node: <TimelineLeg leg={legToEnd} planned={plannedToEnd} onChange={changeLeg} />,
    });
  }

  if (day.end !== null) {
    lines.push({
      key: "end",
      roomy: false,
      node: (
        <EndPill
          which="end"
          day={day}
          endpoint={day.end}
          time={computed.ends === null ? null : formatDayTime(computed.ends)}
          setTime={null}
          onOpen={onOpenEndpoint}
        />
      ),
    });
  } else if (onFindEnd !== null) {
    lines.push({
      key: "end",
      roomy: false,
      gap: "mt-2.5",
      node: (
        <EndOffer
          which="end"
          onFind={() => {
            onFindEnd("end");
          }}
        />
      ),
    });
  }

  return (
    <>
      {/* Faded while the day changes places with another, or a stop moves
          within it or to another day, under the line a desk says it with:
          its times are the ones worked out before, until the new ones
          arrive. */}
      <div ref={dayRef} className={`relative ${busy ? "opacity-55" : ""}`} aria-busy={busy}>
        {/* From the first thing's middle to the last's, behind them all: every
            card and pill is opaque, so the thread shows only in the room
            between them and through the legs, whose discs stand on it. On a
            day with nothing planned yet it is the line a desk's empty day
            waits with, dashed closer in the accent, from one end to the
            other beside the words that say so: waiting for its first stop
            rather than joining two. */}
        <span
          aria-hidden="true"
          className={`${day.stops.length === 0 ? "thread-waiting" : "thread"} absolute top-6 bottom-6 left-[23px]`}
        />
        {lines.map((line, at) => {
          const before = lines[at - 1];
          const apart = before !== undefined && !before.roomy && !line.roomy;
          return (
            <div key={line.key} className={apart ? (line.gap ?? "mt-3") : undefined}>
              {line.node}
            </div>
          );
        })}
      </div>
      {busy ? (
        <p className="mt-3 px-[6px] text-micro text-ink-muted">Working out the new times.</p>
      ) : null}
      {(moveError ?? leaveError) === null ? null : (
        <Notice role="alert" className="mt-3">
          {moveError ?? leaveError}
        </Notice>
      )}

      {/* The carried stop's picture, over everything on the page wherever
          the finger has taken it, so neither the day nor the strip cuts it
          off, as a carried day's is: the same card at the same width, at
          half strength so what it is over shows through it, and at a
          quarter over the strip, since it is as wide as the strip and its
          words crossed the days' at half. For the eye only; the finger goes
          through it to whatever is under it. */}
      {lifted === null || carriedStop === undefined
        ? null
        : createPortal(
            <div
              className={`pointer-events-none fixed z-50 ${lifted.overStrip ? "opacity-25" : "opacity-50"}`}
              style={{ left: lifted.left, top: lifted.top, width: lifted.width }}
            >
              <TimelineStop
                position={lifted.index + 1}
                {...faceOf(carriedStop)}
                leaveAt={null}
                at={null}
                look="picture"
                holdable={false}
                handlers={{}}
                onOpen={null}
              />
            </div>,
            document.body,
          )}
    </>
  );
}
