"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { TravelMode } from "@/core/model/leg";
import type { ComputedLeg } from "@/core/time/compute-day";
import { formatDuration } from "@/core/time/minutes";
import { ArrowUpRightIcon, ChevronDownIcon, ChevronUpIcon } from "@/ui/icons";
import type { LegOption, PlannedLeg } from "./compute-trip";
import { formatDistance } from "@/core/model/distance";
import type { DayActions } from "./day-actions";
import { legColor, legDisc, MODE_ICON, MODE_WORDS } from "./leg-marks";
import { Notice } from "@/ui/notice";

interface LegRowProps {
  readonly leg: ComputedLeg;
  /** Every way of covering this leg, and which one the day is using. */
  readonly planned: PlannedLeg;
  /** Whether the pointer is on this leg, here or on the route on the map. */
  readonly hovered: boolean;
  readonly onHover: (legIndex: number | null) => void;
  /** Null for a reader who holds no edit token, who sees the row and no choice. */
  readonly onChange: DayActions["changeLegMode"] | null;
}

function Option({
  option,
  chosen,
  disabled,
  onPick,
}: {
  readonly option: LegOption;
  readonly chosen: boolean;
  readonly disabled: boolean;
  readonly onPick: () => void;
}) {
  const Icon = MODE_ICON[option.mode];
  /** No route this way, so there is nothing to choose. */
  const unavailable = option.durationMinutes === null;
  /**
   * A mode with no route is not how you are getting there, whatever the day has
   * stored. It can be the one on the stop, from before a reorder or from a
   * default, and marking it as the choice would say a journey is settled that
   * cannot be made at all.
   */
  const isChosen = chosen && !unavailable;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled || unavailable}
      aria-pressed={isChosen}
      /*
       * The one in use is drawn on raised paper inside a heavier terracotta
       * line, with its dot filled. The rest sit straight on the well behind a
       * hairline, so the chosen tile is the one thing in the panel that looks
       * like a card.
       */
      /*
       * The tile's rows are the panel's rows: the glyph, the name, the time
       * and the distance each sit on a row shared with the tiles either
       * side, so a name that runs to two lines in one tile makes the row two
       * lines tall in all of them and the times stay level. Comparing those
       * is the whole of what the panel is opened for. When no name wraps
       * the row is one line and nothing is held open for a second.
       */
      className={`row-span-4 grid min-w-0 grid-rows-subgrid items-start justify-items-start gap-y-[5px] rounded-chip px-[10px] pt-[11px] pb-3 text-left disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${
        isChosen
          ? "border-[1.5px] border-terracotta bg-paper-raised"
          : unavailable
            ? "border border-rule bg-transparent"
            : "border border-rule bg-transparent hover:border-rule-strong"
      }`}
    >
      <span
        className={`flex w-full items-center justify-between ${
          isChosen ? "text-ink" : "text-ink-muted"
        }`}
      >
        <Icon size={17} strokeWidth={2.4} />
        <span
          aria-hidden="true"
          className={`h-[13px] w-[13px] rounded-pill border-[1.5px] ${
            isChosen
              ? "border-terracotta bg-terracotta"
              : "border-rule-strong bg-transparent"
          }`}
        />
      </span>
      <span className="min-w-0 text-micro/[1.2] font-semibold text-ink-muted [overflow-wrap:anywhere]">
        {MODE_WORDS[option.mode]}
      </span>
      {/* The time on its own line in the display face, the one promoted
          number on the tile, and how far under it in body text at the quiet
          tier: two facts, the second qualifying the first. The weight is
          stated because a step with its leading turned off loses the weight
          the scale gives it. */}
      <span className="font-display text-place/none font-semibold tracking-[-0.01em] text-ink tabular-nums [overflow-wrap:anywhere]">
        {unavailable
          ? "Unavailable"
          : `${option.rough ? "about " : ""}${formatDuration(option.durationMinutes ?? 0)}`}
      </span>
      {option.distanceMeters === null ? null : (
        <span className="text-meta/[1.2] text-ink-muted tabular-nums">
          {formatDistance(option.distanceMeters)}
        </span>
      )}
    </button>
  );
}

/**
 * The way to the live version of this leg, at the end of its line.
 *
 * The leg is timed for the moment the day plans to set out on it, but the
 * minute a service leaves and the traffic on the road are not here. The link
 * is where they live: the same two places and the same way between them,
 * opened in Google Maps with "depart at" already set to that moment, so the
 * timetable for public transport, the traffic for a drive, and for a walk the
 * same route with turn by turn directions on it are all for the day planned
 * rather than for now. Two words and an arrow going up and out, since the
 * arrow says it leaves for somewhere else; where to is read out in full.
 */
function LiveTimes({ href }: { readonly href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-auto flex shrink-0 items-center gap-1 rounded-pill text-body/none font-semibold whitespace-nowrap text-terracotta-700 hover:text-terracotta-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      Live times
      <span className="sr-only"> in Google Maps</span>
      <ArrowUpRightIcon size={13} strokeWidth={2.75} />
    </a>
  );
}

/**
 * How you get from one stop to the next, on the thread that joins them.
 *
 * Closed, it is one line hung on the thread: the way's glyph on a disc, and
 * beside it the way in words, how long it takes and how far, and the link to
 * its live times. Open, it is every other way of covering the same ground
 * with what each one costs in time, so the choice is made by reading the
 * alternatives rather than by trying them one at a time.
 *
 * Choosing leaves the panel open. The outline moves to what was picked and the
 * times down the rest of the day move with it, both of which are worth seeing
 * before deciding whether that is the mode you wanted, and trying a second one
 * should not mean opening the panel again. Collapse is what closes it, as the
 * way's name above it does too.
 */
export function LegRow({
  leg,
  planned,
  hovered,
  onHover,
  onChange,
}: LegRowProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const row = useRef<HTMLDivElement | null>(null);

  /**
   * Brought into the panel when the pointer finds this leg on the map, the
   * same way a card is. "nearest" leaves a row already on screen exactly where
   * it is, so hovering one here never scrolls the list out from under the
   * pointer.
   */
  useEffect(() => {
    if (hovered) {
      row.current?.scrollIntoView({ block: "nearest" });
    }
  }, [hovered]);
  const Icon = MODE_ICON[leg.mode];

  const choose = (mode: TravelMode): void => {
    if (onChange === null || saving || mode === planned.chosen) {
      return;
    }
    startSaving(async () => {
      const outcome = await onChange({ stopId: stopIdOf(planned), mode });
      setError(outcome.error);
    });
  };

  /**
   * A leg nobody can cover this way does not name the way. The mode on it is
   * whatever the day has stored, from a default or from before a reorder, and
   * putting "Walk" in front of "Unavailable" reads as a choice that was made
   * rather than one still to make.
   */
  const covered = leg.durationMinutes !== null;
  const anyWay = planned.options.some((option) => option.durationMinutes !== null);
  /** The way in use was not found by the provider, so its time is a guess from the distance. */
  const rough = planned.options.some((option) => option.mode === leg.mode && option.rough);

  /**
   * How long and how far as one quiet run of words, "48 min · 45 km": the two
   * facts the way comes to, after the way itself.
   */
  const facts = [
    `${rough ? "about " : ""}${formatDuration(leg.durationMinutes ?? 0)}`,
    ...(leg.distanceMeters === null ? [] : [formatDistance(leg.distanceMeters)]),
  ].join(" · ");

  /**
   * What opens the other ways, for someone who may change it: the way's name
   * with a chevron pointing where the panel goes, a pill under the pointer as
   * the card's tools are. On a leg with no way, "Change" in its place, since
   * the leg does not name a way it cannot be covered by.
   */
  const toggle =
    onChange === null ? null : (
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          setError(null);
        }}
        aria-expanded={open}
        title="Change how you get there"
        className="-mx-[6px] flex shrink-0 items-center gap-[6px] rounded-pill px-[6px] py-1 text-body/none font-semibold whitespace-nowrap text-ink hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      >
        {covered ? MODE_WORDS[leg.mode] : "Change"}
        {open ? (
          <ChevronUpIcon size={12} strokeWidth={2.75} className="shrink-0 text-ink-muted" />
        ) : (
          <ChevronDownIcon size={12} strokeWidth={2.75} className="shrink-0 text-ink-muted" />
        )}
      </button>
    );

  return (
    /*
     * The stop card's grid, set a step to the left of it. The thread runs
     * down the margin outside the cards, thirteen pixels nearer the edge than
     * their discs, which is how the design file draws it and what makes a leg
     * read as the space between two cards rather than as a third column of
     * them. The words on the leg move with the line, so the way's name lands
     * on the edge the stops' names keep a step in from.
     *
     * The thread is the row's full height less a hair at each end, so the
     * line reads as one from the card above to the card below. The space
     * above and below the words is the row's own, which is what lets the
     * thread run through it: a margin would have been a gap in the line.
     *
     * Under the pointer, here or on the map, the whole row lights the leg's
     * line on the map, and the disc takes a ring of its ink, as the line on
     * the map is drawn heavier.
     */
    <div
      ref={row}
      onMouseEnter={() => {
        onHover(leg.index);
      }}
      onMouseLeave={() => {
        onHover(null);
      }}
      className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-[13px] pr-[17px] pl-1"
    >
      <div className="relative flex justify-center py-[2px]">
        <span className="thread" aria-hidden="true" />
        {/* The glyph on a disc hung on the thread, level with the words, in
            the leg's own ink, the ink its line on the map is drawn in, so the
            two are matched by eye across the page. Smaller than a stop's
            number and never terracotta on its own, so it reads as a way
            between two stops rather than as a third one. The wash is laid
            over the panel's ground rather than over nothing, so the disc is
            solid and the thread passes behind it, as a bead on a string. A
            leg with no way has no line on the map, and no disc. */}
        {covered ? (
          <span
            aria-hidden="true"
            style={{
              ...legDisc(leg.index, "var(--color-paper-sunken)"),
              boxShadow: hovered ? `0 0 0 2px ${legColor(leg.index)}` : undefined,
            }}
            className="absolute top-4 grid h-[26px] w-[26px] place-items-center rounded-pill"
          >
            <Icon size={15} strokeWidth={2.4} />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 py-4">
        {/* One line, as deep as the disc beside it: the way, then how long
            and how far, quietly, at the same step, and the live times on
            the times' right edge. It wraps rather than cutting anything
            short on a narrow panel, the link going to the right of a line
            of its own. */}
        <div className="flex min-h-[26px] flex-wrap items-center gap-x-[10px] gap-y-[6px]">
          {covered ? (
            <>
              {toggle ?? (
                <span className="text-body/none font-semibold whitespace-nowrap text-ink">
                  {MODE_WORDS[leg.mode]}
                </span>
              )}
              <span className="text-body/none whitespace-nowrap text-ink-muted tabular-nums">
                {facts}
              </span>
              {planned.directions === null ? null : <LiveTimes href={planned.directions} />}
            </>
          ) : (
            <>
              {/* What was looked for and not found, then what to do: the way
                  the day has stored for this leg does not run at this time,
                  and the panel the way's toggle opens offers the ones that
                  do. */}
              <span className="text-small/none text-ink-muted">
                {anyWay
                  ? `No ${MODE_WORDS[leg.mode].toLowerCase()} at this time.${onChange === null ? "" : " Choose another way."}`
                  : "No way to get there"}
              </span>
              {toggle}
            </>
          )}
        </div>

        {/* Said under the line, as a conflict is, so a guess is never read as
            a timetable: what was not found, then what the number is instead. */}
        {covered && rough ? (
          <Notice shape="note" className="mt-2">
            No {MODE_WORDS[leg.mode].toLowerCase()} route was found here. The time is a guess
            from the distance.
          </Notice>
        ) : null}

        {onChange !== null && open ? (
          /* Its own scrollbar on a short window, so a panel too tall to fit
             scrolls inside itself rather than pushing the day down past it. */
          <div className="scroll-quiet mt-3 max-h-[50vh] overflow-y-auto rounded-panel border border-rule bg-paper-sunken px-[14px] pt-[13px] pb-[14px]">
            <div className="mb-[11px] flex items-baseline gap-2">
              {/* No distance beside the heading: every way of covering the leg
                  is about to say its own, and they are not all the same. */}
              <p className="text-small/none font-semibold text-ink-muted">How you get there</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                }}
                className="ml-auto flex items-center gap-1 rounded-pill px-1 py-[2px] text-micro/none font-semibold text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
                Collapse
                <ChevronUpIcon size={13} strokeWidth={2.75} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
              {planned.options.map((option) => (
                <Option
                  key={option.mode}
                  option={option}
                  chosen={option.mode === planned.chosen}
                  disabled={saving}
                  onPick={() => {
                    choose(option.mode);
                  }}
                />
              ))}
            </div>

            {saving ? (
              <p className="mt-2 text-micro text-ink-muted">Working out the new times.</p>
            ) : null}
            {error === null ? null : (
              <Notice role="alert" className="mt-2">
                  {error}
              </Notice>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Null means the leg out to where the day ends, which the day itself owns. */
function stopIdOf(planned: PlannedLeg): string | null {
  return planned.target.kind === "stop" ? planned.target.stopId : null;
}
