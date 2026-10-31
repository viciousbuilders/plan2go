"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDownIcon } from "@/ui/icons";
import { ColumnPicker } from "./column-picker";
import type { EditOutcome } from "./day-actions";
import { Notice } from "@/ui/notice";
import { useOutsidePress } from "@/ui/use-outside-press";

const HOURS = Array.from({ length: 24 }, (_unused, hour) => hour);

const MINUTES = Array.from({ length: 60 }, (_unused, minute) => minute);

/** Two digits every time: "09", "05". */
function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * The time where the day's times are, in their face and their step, with a
 * chevron after it to say it opens, and no edge round it: the chevron is what
 * says this time is the one that is set rather than worked out, as on a
 * phone. Under the pointer, and while its picker is open, it stands on the
 * lightest tint of the colour it is in.
 *
 * It takes exactly the room the time takes without it, so nothing else on
 * the card or the row moves when it is there: the time's own line height,
 * a pixel of padding and a pixel of edge above and below, the edge drawn in
 * nothing, and those two pixels given back by the margin round it. The time
 * lands where a reader's plain time does. Across, everything on the times
 * line is seven apart as it is seen: the pill's side to the time, the time
 * to the chevron, the chevron to the pill's side, that to the arrow and the
 * arrow to the next time. The chevron and the arrow each carry a little
 * margin of their own inside their box, so the gaps written here are smaller
 * than the ones that show, and the gap to the chevron is the same five the
 * line puts before its arrow.
 *
 * The weight is the time step's own, which comes with it when no line height
 * is named after it.
 *
 * Only an enabled pill lifts. While a time is being saved it cannot be
 * pressed, and a pill that still rose under the pointer said it could.
 */
/**
 * On a phone the pill answers a finger forty tall, though it is drawn no
 * taller than the time it stands in for: the room it answers in reaches over
 * and under it, into the card's padding and the gap over the name, where
 * nothing else is pressed.
 */
const TRIGGER =
  "flex items-center rounded-pill border py-px tabular-nums disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta max-lg:relative max-lg:before:absolute max-lg:before:-inset-x-1 max-lg:before:-inset-y-[10px]";

/**
 * How the time is drawn, for each place it stands, and the colours of the
 * picker it opens. Everywhere in the colour of what it stands on, so the
 * start of a day is one colour all through, its time and its picker with it.
 *
 * A desk's is in the display face at the time step, as the card's times are.
 * On the start of the day, the sage row the start stands on, in the sage 800
 * a phone's start is in, the chevron in the same, on sage 200 under the
 * pointer and while the picker is open, a step down from the row's sage 100.
 * On the first stop of a day with no start, the card's times' accent, the
 * chevron in the arrow's two thirds beside it, on the accent's 200 under the
 * pointer and while the picker is open, as a phone's first stop takes it.
 * Neither the row nor the card sinks under a pointer on one of its controls,
 * so the fill is laid on them as they are at rest, and has to stand apart
 * from that.
 *
 * A phone's is in the body face bold at the place step as every time in a
 * phone's day is, in the 800 of what it stands on, the chevron in the same,
 * and that ramp's lighter fill under a pointer and while the picker is open,
 * 4px in and 3px to the chevron in the 74px column a phone's day keeps its
 * times in. On the start's sage pill that is sage, picker and all; on a first
 * stop's terracotta block, with no start, it is the accent.
 */
const LOOKS = {
  deskStart: {
    type: "gap-[5px] pr-[4px] pl-[6px] font-display text-time",
    closed: "border-transparent text-sage-800 enabled:hover:bg-sage-200",
    open: "border-transparent bg-sage-200 text-sage-800",
    chevron: "text-sage-800",
    picker: "sage",
  },
  deskStop: {
    type: "gap-[5px] pr-[4px] pl-[6px] font-display text-time",
    closed: "border-transparent text-terracotta-700 enabled:hover:bg-terracotta-200",
    open: "border-transparent bg-terracotta-200 text-terracotta-700",
    chevron: "text-terracotta-700/65",
    picker: "accent",
  },
  start: {
    type: "gap-[3px] pr-0.5 pl-1 text-place/none font-bold",
    closed: "border-transparent text-sage-800 enabled:hover:bg-sage-100",
    open: "border-transparent bg-sage-100 text-sage-800",
    chevron: "text-sage-800",
    picker: "sage",
  },
  stop: {
    type: "gap-[3px] pr-0.5 pl-1 text-place/none font-bold",
    closed: "border-transparent text-terracotta-800 enabled:hover:bg-terracotta-200",
    open: "border-transparent bg-terracotta-200 text-terracotta-800",
    chevron: "text-terracotta-800",
    picker: "accent",
  },
} as const;

/** Minutes from midnight on the clock: "09:05". */
function toClock(minutes: number): string {
  const hour = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

interface LeaveAtProps {
  /** When the day begins, as minutes from local midnight, as it is stored. */
  readonly value: number;
  /**
   * When the day actually leaves, as the day's other times were worked out
   * from it. The same as the stored time on every day but the one a clock
   * jumps forward on, where a time inside the missing hour is read as the
   * hour after it: stored 02:30, the day leaves at 03:30, and the arrow after
   * the pill agrees with 03:30. So this is what the pill says when it is
   * closed with nothing waiting to be written.
   */
  readonly clock: string;
  readonly onChoose: (minutes: number) => Promise<EditOutcome>;
  /**
   * Which end of the pill its picker and its notice hang from. The right on a
   * desk's card, where the times stand at the right; the left on a phone,
   * where they stand in a column down the left of the window, and a picker
   * hung from the right ran off it.
   */
  readonly align?: "left" | "right";
  /** Where it stands: the start of the day or its first stop, on a desk or a phone. */
  readonly look?: keyof typeof LOOKS;
}

/**
 * When the day leaves: the one clock on the day, set where it shows. That is
 * the start point's time when the day has one, and otherwise the first
 * stop's arrival, which with nothing before it is the moment the day sets
 * out. Every other time follows from this one, worked out through the legs
 * and the stays, which is why no other stop and no end of the day offers a
 * time of its own to set.
 *
 * The time is a button, and the picker it opens is the product's own, two
 * columns, hours and minutes, opening on the time that is set, each choice
 * showing on the line the moment it is clicked, and no button to press
 * afterwards: clicking away is what closes it. Nothing is typed, so there is
 * no half-written time to refuse.
 *
 * Nothing is written while a time is still being chosen. The picker writes
 * when it closes, so a morning picked as an hour and then a minute is one
 * trip to the server rather than two.
 */
export function LeaveAt({
  value,
  clock,
  onChoose,
  align = "right",
  look = "deskStop",
}: LeaveAtProps) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const container = useRef<HTMLDivElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  // A time that came back from the server is what the line shows, unless the
  // picker is open on a choice that has not been written yet, which must not
  // be snatched back by the save that went before it.
  if (seen !== value) {
    setSeen(value);
    if (!open) {
      setDraft(value);
    }
  }

  const hour = Math.floor(draft / 60) % 24;
  const minute = draft % 60;

  /** A time being chosen, or chosen and not back yet, is said as chosen. */
  const shown = open || draft !== value ? toClock(draft) : clock;

  /**
   * A time chosen and not yet written is written if the pill goes before its
   * picker is closed. The pill is not always where it was: it is on the first
   * card until a start point is added, and then on that, and a reorder can
   * put a different card first, so the one a time was being chosen on can be
   * taken away with the picker still open. Closing is what writes, and a pill
   * taken away is never closed, so without this the choice would be dropped
   * without a word. What is sent is read at the moment it goes, from here.
   * The answer comes back to nothing: the pill that would show an error is
   * gone, and the day is read again after the write whatever it says.
   */
  const pending = useRef({ open, draft, value, onChoose });
  useEffect(() => {
    pending.current = { open, draft, value, onChoose };
  });
  useEffect(
    () => () => {
      const last = pending.current;
      if (last.open && last.draft !== last.value) {
        void last.onChoose(last.draft);
      }
    },
    [],
  );

  /** Setting the time to the one it already was is not a change worth a write. */
  const close = (): void => {
    setOpen(false);
    if (draft === value) {
      return;
    }
    startSaving(async () => {
      setError((await onChoose(draft)).error);
    });
  };

  useOutsidePress(container, open, close);

  return (
    <div ref={container} className="relative -my-[2px] flex flex-none items-center">
      {/* Named for what it sets, with the time it shows in the name, so it is
          found by the words on it as well as read out with them. */}
      <button
        type="button"
        ref={trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Leave at ${shown}`}
        disabled={saving}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          setOpen(true);
        }}
        className={`${TRIGGER} ${LOOKS[look].type} ${open ? LOOKS[look].open : LOOKS[look].closed}`}
      >
        {shown}
        <ChevronDownIcon size={12} strokeWidth={2.75} className={`shrink-0 ${LOOKS[look].chevron}`} />
      </button>

      {open ? (
        <ColumnPicker
          label="When the day leaves"
          align={align}
          tone={LOOKS[look].picker}
          onEscape={() => {
            close();
            trigger.current?.focus();
          }}
          columns={[
            {
              unit: "hr",
              values: HOURS,
              chosen: hour,
              format: twoDigits,
              onPick: (one) => {
                setDraft(one * 60 + minute);
              },
            },
            {
              unit: "min",
              values: MINUTES,
              chosen: minute,
              format: twoDigits,
              onPick: (one) => {
                setDraft(hour * 60 + one);
              },
            },
          ]}
        />
      ) : null}

      {/* Hangs off the control, over what is under it rather than in the row
          with it, the way the name and the dates say what went wrong. */}
      {error === null ? null : (
        <Notice
          role="alert"
          shape="bubble"
          className={`${align === "right" ? "right-0" : "left-0 w-max"} max-w-[260px]`}
        >
            {error}
        </Notice>
      )}
    </div>
  );
}
