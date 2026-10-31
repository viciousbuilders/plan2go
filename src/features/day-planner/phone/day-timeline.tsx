"use client";

import type { ReactNode } from "react";
import type { Conflict } from "@/core/model/conflict";
import { conflictsAtStop } from "@/core/model/conflict";
import type { DayEndpoint, DayPlan } from "@/core/model/day";
import type { ComputedDay, ComputedStop } from "@/core/time/compute-day";
import { formatClock } from "@/core/time/minutes";
import { NoteIcon, PlusIcon } from "@/ui/icons";
import type { PlannedDay } from "../compute-trip";
import { ConflictNotice } from "../conflict-notice";
import type { DayActions } from "../day-actions";
import { ENDS, MARKS } from "../day-ends";
import type { EndpointRef } from "../day-itinerary";
import { formatDayTime } from "../format-day-time";
import { LeaveAt } from "../leave-at";
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

/** What the day does at each end, read out before the place's name. */
function endVerb(which: "start" | "end", day: DayPlan): string {
  if (which === "start") {
    return "Leave";
  }
  const back = day.start !== null && day.end !== null && day.start.place.id === day.end.place.id;
  return back ? "Back at" : "Finish at";
}

/**
 * The shape both of an end's pills share: 48px tall and rounded to half that,
 * so one line is a pill and a name long enough for two makes a card with the
 * same round ends.
 */
const END_PILL = "relative flex min-h-12 w-full items-center rounded-[24px] text-left";

/**
 * An end of the day that is there, as the phone's day design draws it: a pill
 * of sage 200 with no glyph on it, when the day passes the end in bold sage
 * 800 at its left and the place's name in bold sage 900 after it. The time
 * stands in a stop card's column of times, 68px wide from 10px in, and the
 * name where a stop's name starts, so the day's times stand in one column and
 * its names in another, ends and stops alike. At the start the time is when
 * the day leaves, which for someone who may edit is the pill that sets it, a
 * desk's dashed pill, in the same column.
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
        className={`flex min-w-[68px] shrink-0 justify-center ${setTime === null ? "" : "relative z-[1]"}`}
      >
        {setTime ??
          (time === null ? null : (
            <p className="text-body/none font-bold whitespace-nowrap text-sage-800 tabular-nums">
              {time}
            </p>
          ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onOpen({ dayId: day.id, which, placeId: endpoint.place.id });
        }}
        className="min-w-0 flex-1 text-left text-place/[1.25] font-bold break-words text-sage-900 after:absolute after:-inset-px after:rounded-[24px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-terracotta"
      >
        <span className="sr-only">{`${endVerb(which, day)} `}</span>
        {endpoint.place.name}
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
      <span className="min-w-0 flex-1 text-place/[1.25] font-bold text-sage-800">
        {ENDS[which].add}
      </span>
      <PlusIcon size={16} strokeWidth={2.75} className="shrink-0 text-sage-600" />
    </button>
  );
}

/**
 * A stop, as the phone's day design draws it: a card of raised paper at the
 * row radius under the small shadow, full width, with no number on it. At its
 * left, on a block of terracotta 100 as tall as the card less its padding,
 * when the stop is reached in bold terracotta 800 over when it is left, "to
 * 10:14", smaller in terracotta 700; then the place's name in the display face
 * over its address in neutral 700. With no start point, for someone who may
 * edit, the first stop's arrival is when the day leaves, and the pill that
 * sets it stands in the block in place of the time.
 *
 * The whole card is one button that opens the place, where the stay, the note
 * and the stop's place in the day are changed and the stop is taken off: on a
 * phone the day is read here and changed there. What the day has to say about
 * the stop stays on the card under the words, a conflict with its numbers in
 * it, and the note for whoever is travelling.
 */
function TimelineStop({
  position,
  stop,
  address,
  note,
  conflicts,
  leaveAt,
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
  readonly onOpen: () => void;
}) {
  const times = leaveAt !== null || stop.arrival !== null;
  return (
    <div className="relative flex gap-3.5 rounded-row bg-paper-raised py-2 pr-4 pl-2.5 shadow-sm hover:bg-paper-sunken">
      {times ? (
        /* Over the button's reach only when it holds the pill that sets the
           time; otherwise a press on the times opens the place too. The pill
           is a desk's, as wide as the block, so the block keeps 2px either
           side of it rather than 8, and stands within 3px of the others'
           width, the names beside them on one edge. */
        <div
          className={`flex min-w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-chip bg-terracotta-100 py-2.5 text-center tabular-nums ${
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
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-col gap-1 text-left after:absolute after:inset-0 after:rounded-row focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-terracotta"
        >
          <span className="sr-only">{`Stop ${String(position)}, `}</span>
          <span className="font-display text-lead/[1.15] break-words text-ink">{stop.placeName}</span>
          {address === null ? null : (
            <span className="text-small break-words text-neutral-700">{address}</span>
          )}
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
          className="flex min-w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-chip bg-terracotta-200 px-2 py-2.5 text-center tabular-nums"
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
 * A day with no stops, between its ends: the line the stops will hang on,
 * dashed in the accent because nothing hangs on it yet, and beside it, on the
 * ends' names' edge, the words a desk says, with the way to the first place
 * under them for someone who may edit, in the accent's solid pill since it is
 * the one thing to do.
 */
function NothingPlanned({ onFindPlace }: { readonly onFindPlace: (() => void) | null }) {
  return (
    <div className="relative py-3 pl-[52px]">
      <span aria-hidden="true" className="thread-waiting absolute inset-y-0 left-[23px]" />
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
  );
}

/**
 * One thing down the day. A leg, and a day with nothing on it, carry their
 * own room above and below; two things that do not are set apart by `gap`,
 * twelve unless said otherwise.
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
}: DayTimelineProps) {
  /**
   * When the day leaves, set where that time shows: on the start point's
   * time when the day has one, and otherwise on the first stop's arrival.
   * Keyed by the day, so a time half chosen on one day is not carried to the
   * next. Its picker hangs from its left, into the window. In sage on the
   * start's sage pill, where its time is the colour the end's time is, and in
   * the accent on a stop's terracotta block.
   */
  const leaveAt =
    actions === null ? null : (
      <LeaveAt
        key={day.id}
        value={day.startAtMinutes}
        clock={formatClock(computed.begins.minutesFromMidnight)}
        onChoose={(startAtMinutes) => actions.setDayStart({ startAtMinutes })}
        align="left"
        tone={day.start === null ? "accent" : "sage"}
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
    lines.push({ key: "nothing", roomy: true, node: <NothingPlanned onFindPlace={onFindPlace} /> });
  }

  computed.stops.forEach((stop, index) => {
    const leg = computed.legs[index + legOffset];
    const planned = leg === undefined ? undefined : legs[leg.index];
    if (leg !== undefined && planned !== undefined) {
      lines.push({
        key: `leg-${String(leg.index)}`,
        roomy: true,
        node: <TimelineLeg leg={leg} planned={planned} onChange={changeLeg} />,
      });
    }
    const plan = stops.get(stop.stopId);
    lines.push({
      key: stop.stopId,
      roomy: false,
      node: (
        <TimelineStop
          position={index + 1}
          stop={stop}
          address={plan?.place.address ?? null}
          note={plan?.note ?? null}
          conflicts={conflictsAtStop(computed.conflicts, stop.stopId)}
          leaveAt={index === 0 && day.start === null ? leaveAt : null}
          onOpen={() => {
            onOpenStop(stop.stopId);
          }}
        />
      ),
    });
  });

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
    <div className="relative">
      {/* From the first thing's middle to the last's, behind them all: every
          card and pill is opaque, so the thread shows only in the room
          between them and through the legs, whose discs stand on it. A day
          with no stops draws its own waiting line instead. */}
      {day.stops.length === 0 ? null : (
        <span aria-hidden="true" className="thread absolute top-6 bottom-6 left-[23px]" />
      )}
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
  );
}
