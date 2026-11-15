"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { formatDistance } from "@/core/model/distance";
import type { TravelMode } from "@/core/model/leg";
import type { ComputedLeg } from "@/core/time/compute-day";
import { formatDuration } from "@/core/time/minutes";
import { ArrowUpRightIcon, ChevronDownIcon } from "@/ui/icons";
import { Notice } from "@/ui/notice";
import type { LegOption, PlannedLeg } from "../compute-trip";
import type { DayActions } from "../day-actions";
import { MODE_ICON, MODE_WORDS } from "../leg-marks";

interface TimelineLegProps {
  readonly leg: ComputedLeg;
  /** Every way of covering this leg, and which one the day is using. */
  readonly planned: PlannedLeg;
  /** Null for a reader who holds no edit token, who is shown the ways and no choice. */
  readonly onChange: DayActions["changeLegMode"] | null;
}

/** Null means the leg out to where the day ends, which the day itself owns. */
function stopIdOf(planned: PlannedLeg): string | null {
  return planned.target.kind === "stop" ? planned.target.stopId : null;
}

/**
 * Each way's own colour, its glyph in 700 on a disc of 200, the same on the
 * day's thread and in the sheet, so a way is known by its colour before its
 * word is read. Only the phone's day wears them: the map colours a leg by
 * which leg it is, and the desk keeps the map's inks.
 */
const WAY_DISC: Readonly<Record<TravelMode, string>> = {
  drive: "bg-drive-200 text-drive-700",
  transit: "bg-transit-200 text-transit-700",
  walk: "bg-walk-200 text-walk-700",
};

/** How long a way takes, said as a guess when the provider found no route that way. */
function took(minutes: number, rough: boolean): string {
  return `${rough ? "about " : ""}${formatDuration(minutes)}`;
}

/**
 * One way of covering the leg, as a row of the sheet: the way's glyph on a
 * disc in the way's colour, its name over how far it goes, and how long it takes in the
 * display face at the end, the one number the sheet is opened to compare.
 * The one in use is filled with the accent's lightest tint inside the
 * accent's edge.
 */
function Way({
  option,
  chosen,
  disabled,
  onPick,
}: {
  readonly option: LegOption;
  readonly chosen: boolean;
  readonly disabled: boolean;
  /** Null for a reader, who is shown the ways and chooses none of them. */
  readonly onPick: (() => void) | null;
}) {
  const Icon = MODE_ICON[option.mode];
  /** No route this way, so there is nothing to choose. */
  const unavailable = option.durationMinutes === null;
  /**
   * A way with no route is not how the traveller is getting there, whatever
   * the day has stored, so it is never marked as the one in use.
   */
  const isChosen = chosen && !unavailable;
  const shape = `flex min-h-16 w-full items-center gap-3 rounded-panel border-2 px-[14px] py-[13px] text-left ${
    isChosen ? "border-terracotta bg-terracotta-100" : "border-rule bg-sheet"
  }`;
  const inside = (
    <>
      <span
        className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-pill ${WAY_DISC[option.mode]}`}
      >
        <Icon size={18} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body/[1.2] font-bold text-ink">{MODE_WORDS[option.mode]}</span>
        {option.distanceMeters === null ? null : (
          <span className="mt-[3px] block text-meta/[1.3] font-medium text-ink-muted tabular-nums">
            {formatDistance(option.distanceMeters)}
          </span>
        )}
      </span>
      {unavailable ? (
        <span className="shrink-0 text-small/none font-semibold text-ink-muted">Unavailable</span>
      ) : (
        <span className="shrink-0 font-display text-lead/none font-semibold whitespace-nowrap text-ink tabular-nums">
          {took(option.durationMinutes ?? 0, option.rough)}
        </span>
      )}
    </>
  );

  if (onPick === null) {
    return <div className={`${shape} ${unavailable ? "opacity-45" : ""}`}>{inside}</div>;
  }
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled || unavailable}
      aria-pressed={isChosen}
      className={`${shape} disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta`}
    >
      {inside}
    </button>
  );
}

/**
 * How the day gets from one place to the next on a phone, drawn as a desk's
 * leg is: a line rather than a box between two cards, the way's glyph on a
 * 26px disc in the way's colour standing on the day's thread, its middle on
 * the ends' discs' middle, then the way's name with a chevron after it on the
 * pill a desk's leg has, and how long it takes and how far, "14 min · 1.2 km",
 * going under the pill when the line has no room for them. A leg that cannot
 * be made says so, with no glyph on a disc of neutral 200, since it names no
 * way as settled, and "Change" on the pill for someone who may edit. Only the
 * pill opens anything: pressed, the ways
 * of covering the same ground come up from the foot of the window in a sheet,
 * one row each. For someone who may edit, choosing one puts it on the day and
 * lets the sheet go once the new times are worked out, since the day under
 * the sheet cannot be seen to change while it is up.
 *
 * The leg's link to its live times in Google Maps, and the sentence saying a
 * time is a guess, are in the sheet with the ways, where there is room for
 * them; the leg is one line on the thread.
 */
export function TimelineLeg({ leg, planned, onChange }: TimelineLegProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const pill = useRef<HTMLButtonElement | null>(null);
  const sheet = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  /** The sheet takes the keyboard as it comes up, so Escape and Tab start there. */
  useEffect(() => {
    if (open) {
      sheet.current?.focus();
    }
  }, [open]);

  const close = (): void => {
    setOpen(false);
    pill.current?.focus();
  };

  const choose = (mode: TravelMode): void => {
    if (onChange === null || saving) {
      return;
    }
    if (mode === planned.chosen) {
      close();
      return;
    }
    startSaving(async () => {
      const outcome = await onChange({ stopId: stopIdOf(planned), mode });
      setError(outcome.error);
      if (outcome.error === null) {
        close();
      }
    });
  };

  const Icon = MODE_ICON[leg.mode];
  const covered = leg.durationMinutes !== null;
  const anyWay = planned.options.some((option) => option.durationMinutes !== null);
  /** The way in use was not found by the provider, so its time is a guess from the distance. */
  const rough = planned.options.some((option) => option.mode === leg.mode && option.rough);
  /**
   * How long and how far as one quiet run of words, "14 min · 1.2 km", as a
   * desk's leg says them after the way's pill.
   */
  const facts = [
    took(leg.durationMinutes ?? 0, rough),
    ...(leg.distanceMeters === null ? [] : [formatDistance(leg.distanceMeters)]),
  ].join(" · ");
  /**
   * The one thing on the line that opens the sheet: the way's name with a
   * chevron after it on the pill a desk's leg opens its ways from, in the
   * warm grey a leg is drawn in, neutral 200 inside an edge of neutral 300,
   * a step darker while pressed and while its sheet is up, as a desk's goes
   * under the pointer and while its panel is open. It answers only where it
   * is drawn: the disc, the time and the room round them do nothing, so a
   * finger resting on the day to read it opens nothing. A reader gets it
   * too, since the sheet is where the ways compare and where the leg's
   * Google Maps link is.
   */
  const opener = (words: string) => (
    <button
      type="button"
      ref={pill}
      aria-haspopup="dialog"
      aria-expanded={open}
      title={onChange === null ? undefined : "Change how you get there"}
      onClick={() => {
        setError(null);
        setOpen(true);
      }}
      className={`flex h-8 shrink-0 items-center gap-2 rounded-pill border pr-[10px] pl-3 text-small/none font-semibold whitespace-nowrap text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${
        open
          ? "border-neutral-400 bg-neutral-300"
          : "border-neutral-300 bg-neutral-200 active:border-neutral-400 active:bg-neutral-300"
      }`}
    >
      {words}
      <ChevronDownIcon size={12} strokeWidth={2.75} className="shrink-0 text-ink-muted" />
    </button>
  );

  return (
    <div>
      {/* One line hung on the thread, twelve above and below a 32px pill,
          the disc level with the pill's middle when the time goes under it.
          Positioned so the disc paints over the day's thread, which shows
          above and below it. */}
      <div className="relative flex items-start gap-3 py-3 pl-[11px]">
        <span
          aria-hidden="true"
          className={`mt-[3px] grid size-[26px] shrink-0 place-items-center rounded-pill ${
            covered ? WAY_DISC[leg.mode] : "bg-neutral-200"
          }`}
        >
          {covered ? <Icon size={15} strokeWidth={2.4} /> : null}
        </span>
        <div className="flex min-h-8 min-w-0 flex-wrap items-center gap-x-[10px] gap-y-[6px]">
          {covered ? (
            <>
              {opener(MODE_WORDS[leg.mode])}
              <span className="text-body/none whitespace-nowrap text-ink-muted tabular-nums">
                {facts}
              </span>
            </>
          ) : (
            <>
              {/* A leg nobody can cover the way the day has stored does not
                  name that way as if it were settled: it says what was not
                  found, and for someone who may edit, the sheet offers the
                  ways that run. A reader gets the words alone, as on a desk. */}
              <span className="text-small text-ink-muted">
                {anyWay
                  ? `No ${MODE_WORDS[leg.mode].toLowerCase()} at this time`
                  : "No way to get there"}
              </span>
              {onChange === null ? null : opener("Change")}
            </>
          )}
        </div>
      </div>

      {open ? (
        /* Over the whole window, the page dimmed under it, the sheet at the
           foot of it on raised paper rounded at the top, under the deepest
           shadow, the one kept for a layer over the whole viewport. A press
           on the dimmed page puts it away, as Escape does. It comes up in
           one frame, as every panel but the place's sheet does. */
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={close}
            className="absolute inset-0 touch-none bg-ink/35"
          />
          <div
            ref={sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
            }}
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-[30px] bg-paper-raised px-4 pt-[10px] pb-[max(24px,env(safe-area-inset-bottom))] shadow-lg outline-none"
          >
            <div aria-hidden="true" className="mx-auto mb-4 h-[5px] w-10 rounded-pill bg-ink/20" />
            {/* The places' names keep the lead step's weight and the words
                between them are regular. Each half is kept whole, so a pair
                of names too long for one line breaks before "to" rather than
                inside a place's name. */}
            <h2 id={titleId} className="px-[6px] font-display text-lead text-ink">
              <span className="inline-block">
                <span className="font-normal">From</span> {leg.fromName}
              </span>{" "}
              <span className="inline-block">
                <span className="font-normal">to</span> {leg.toName}
              </span>
            </h2>

            <div className="mt-4 flex flex-col gap-2">
              {planned.options.map((option) => (
                <Way
                  key={option.mode}
                  option={option}
                  chosen={option.mode === planned.chosen}
                  disabled={saving}
                  onPick={
                    onChange === null
                      ? null
                      : () => {
                          choose(option.mode);
                        }
                  }
                />
              ))}
            </div>

            {saving ? (
              <p className="mt-3 px-[6px] text-micro text-ink-muted">Working out the new times.</p>
            ) : null}
            {error === null ? null : (
              <Notice role="alert" className="mt-3">
                {error}
              </Notice>
            )}
            {covered && rough ? (
              <Notice shape="note" className="mt-3">
                No {MODE_WORDS[leg.mode].toLowerCase()} route was found here. The time is a guess
                from the distance.
              </Notice>
            ) : null}
            {covered && planned.directions !== null ? (
              /* With the arrow going up and out after the words that a desk's
                 link has, since it leaves for somewhere else. Laid out only
                 as tall as its words: the 8px of reach under them is taken
                 back from the room under it, and the 8px over them is most
                 of its 12 from what is above, so a finger finds it without
                 the sheet standing open round it. */
              <a
                href={planned.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 -mb-2 flex w-fit items-center gap-1 rounded-pill px-[6px] py-2 text-small font-semibold text-terracotta-700 hover:text-terracotta-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
                Live times in Google Maps
                <ArrowUpRightIcon size={13} strokeWidth={2.75} className="shrink-0" />
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
