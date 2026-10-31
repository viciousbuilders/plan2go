"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { formatDistance } from "@/core/model/distance";
import type { TravelMode } from "@/core/model/leg";
import type { ComputedLeg } from "@/core/time/compute-day";
import { formatDuration } from "@/core/time/minutes";
import { ChevronDownIcon } from "@/ui/icons";
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

/** How long a way takes, said as a guess when the provider found no route that way. */
function took(minutes: number, rough: boolean): string {
  return `${rough ? "about " : ""}${formatDuration(minutes)}`;
}

/**
 * One way of covering the leg, as a row of the sheet: the way's glyph on a
 * disc of sage, its name over how far it goes, and how long it takes in the
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
      <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-pill bg-sage-200 text-sage-800">
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
 * How the day gets from one place to the next on a phone, as the phone's day
 * design draws it: a line rather than a box between two cards, the way's
 * glyph on a 26px disc of neutral 200 standing on the day's thread, its
 * middle on the ends' discs' middle, then the way and how long it takes in
 * neutral 700, "Drive 14 min", with a chevron after it. A leg that cannot be
 * made says so in the same ink, with no glyph on its disc. Pressed, the ways
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
   * A leg nobody can cover the way the day has stored does not name that way
   * as if it were settled: it says what was not found, and the sheet offers
   * the ways that run.
   */
  const words = covered
    ? `${MODE_WORDS[leg.mode]} ${took(leg.durationMinutes ?? 0, rough)}`
    : anyWay
      ? `No ${MODE_WORDS[leg.mode].toLowerCase()} at this time`
      : "No way to get there";

  return (
    <div>
      {/* A button for a reader too: the sheet is where the ways compare,
          and where the leg's live times are linked from. The whole line is
          the button, fifty tall, so a finger finds it anywhere along it. It
          is positioned so the disc paints over the day's thread, which shows
          above and below it. */}
      <button
        type="button"
        ref={pill}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="relative flex w-full items-center gap-3 py-3 pl-[11px] text-left text-body/none font-semibold whitespace-nowrap text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      >
        <span
          aria-hidden="true"
          className="grid size-[26px] shrink-0 place-items-center rounded-pill bg-neutral-200 text-neutral-800"
        >
          {covered ? <Icon size={15} strokeWidth={2.4} /> : null}
        </span>
        <span className="min-w-0 truncate">{words}</span>
        <ChevronDownIcon size={13} strokeWidth={3} className="-ml-[5px] shrink-0" />
      </button>

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
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-[30px] bg-paper-raised px-4 pt-[10px] pb-[max(32px,env(safe-area-inset-bottom))] shadow-lg outline-none"
          >
            <div aria-hidden="true" className="mx-auto mb-4 h-[5px] w-10 rounded-pill bg-ink/20" />
            <div className="px-[6px]">
              <h2 id={titleId} className="font-display text-lead text-ink">
                Getting to {leg.toName}
              </h2>
              <p className="mt-1 text-small font-medium text-ink-muted">From {leg.fromName}</p>
            </div>

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
              <a
                href={planned.directions}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-pill px-[6px] py-2 text-small font-semibold text-terracotta-700 hover:text-terracotta-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
                Live times in Google Maps
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
