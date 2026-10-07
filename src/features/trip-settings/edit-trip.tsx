"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { formatTripDates } from "@/features/day-planner/format-day-date";
import { PencilIcon } from "@/ui/icons";
import { MENU_ITEM } from "@/ui/menu";
import { Notice } from "@/ui/notice";
import type { DrawnRange } from "./month-calendar";
import { MonthCalendar } from "./month-calendar";
import { SheetRow } from "./sheet-row";
import { useMenuPages } from "./trip-menu";
import type { TripSettingsOutcome } from "./trip-settings";
import { UNSAVED } from "./trip-settings";

/** Which field, over it: the interface's own tier in bold, as a label over a value. */
const LABEL = "text-small/none font-bold text-ink";

/**
 * The name's field: raised paper inside a 1.5px hairline, fifty tall, taking
 * the accent's edge while it is being typed in or was refused. 16px, as every
 * field on a phone is, since iOS zooms the whole page into a field set any
 * smaller.
 */
const NAME_FIELD =
  "min-h-[50px] w-full rounded-pill border-[1.5px] border-rule bg-paper-raised px-[18px] text-[16px]/none font-medium text-ink caret-terracotta outline-none placeholder:text-ink-faint focus-visible:border-terracotta aria-invalid:border-terracotta";

/** The one way off the page with something written: the accent's solid pill, across it. */
const SAVE =
  "w-full rounded-pill bg-terracotta px-5 py-4 text-place/none font-semibold text-paper hover:bg-terracotta-600 active:bg-terracotta-700 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

interface EditTripProps {
  readonly slug: string;
  /** Saving is a change, and changes need the key. */
  readonly editKey: string;
  readonly title: string;
  readonly startDate: string;
  readonly endDate: string;
  /**
   * The same save the name's row uses on a desk. Passed in rather than
   * imported, because a feature may not reach into the route that owns the
   * mutation.
   */
  readonly onSave: (
    previous: TripSettingsOutcome,
    formData: FormData,
  ) => Promise<TripSettingsOutcome>;
}

/**
 * The trip's name and dates as a phone changes them, on a page over the whole
 * window, the way design 1b draws the start of a trip: Cancel at its head in
 * the accent's deepest brown, "Plan your trip" at the headline step, the
 * name's field, the month to draw the dates on, and at its foot what has been
 * drawn, the dates and how many days they come to, over Save trip.
 *
 * Nothing is written until Save trip is pressed, and it cannot be until both
 * ends are drawn. Cancel or Escape leaves the trip as it was. Either way the
 * menu goes with the page, and what is left is the trip as it now is.
 *
 * Saved by hand rather than by a form: the menu is drawn inside the form on
 * the name's row, and a form cannot hold another.
 */
function EditTripPage({
  slug,
  editKey,
  title,
  startDate,
  endDate,
  onSave,
  onClose,
}: EditTripProps & { readonly onClose: () => void }) {
  const headingId = useId();
  const fieldId = useId();
  const page = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState(title);
  const [range, setRange] = useState<DrawnRange>({ start: startDate, end: endDate });
  /** What the save said when it refused, until anything on the page changes. */
  const [refusal, setRefusal] = useState<TripSettingsOutcome | null>(null);
  const [saving, startSaving] = useTransition();

  /** The page takes the keyboard as it comes up, so Escape and Tab start there. */
  useEffect(() => {
    page.current?.focus();
  }, []);

  const save = (): void => {
    const last = range.end;
    if (last === null || saving) {
      return;
    }
    const form = new FormData();
    form.set("slug", slug);
    form.set("editKey", editKey);
    form.set("title", name);
    form.set("startDate", range.start);
    form.set("endDate", last);
    startSaving(async () => {
      const outcome = await onSave(UNSAVED, form);
      if (outcome.error === null) {
        onClose();
        return;
      }
      setRefusal(outcome);
    });
  };

  return (
    // Fixed over the whole window, the bar of views at its foot included, on
    // the page's own paper. It scrolls as a page does when it is taller than
    // the window, which a phone on its side makes it.
    <div
      ref={page}
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      className="fixed inset-0 z-10 flex flex-col overflow-y-auto overscroll-contain bg-paper px-5 pt-[max(12px,env(safe-area-inset-top))] text-left outline-none lg:hidden"
    >
      <div className="flex min-h-11 items-center">
        <button
          type="button"
          onClick={onClose}
          className="-ml-1 rounded-pill px-1 py-[10px] text-body/none font-bold text-terracotta-800 hover:text-terracotta-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          Cancel
        </button>
      </div>
      <h2 id={headingId} className="mt-1 font-display text-headline tracking-[-0.01em] text-ink">
        Plan your trip
      </h2>

      <label htmlFor={`${fieldId}-name`} className={`mt-6 ${LABEL}`}>
        Trip name
      </label>
      {/* Not `required`, for the reason the name's row gives: empty is
          refused by the save, in the product's own sentence. */}
      <input
        id={`${fieldId}-name`}
        type="text"
        maxLength={80}
        value={name}
        placeholder="Trip name"
        aria-invalid={refusal?.field === "title"}
        onChange={(event) => {
          setName(event.target.value);
          setRefusal(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            // The form round the menu is the name row's, so Enter is kept
            // from it and saves this page instead.
            event.preventDefault();
            save();
          }
        }}
        className={`mt-[10px] ${NAME_FIELD}`}
      />
      {refusal?.field === "title" ? (
        <Notice role="alert" size="meta" className="mt-2">
          {refusal.error}
        </Notice>
      ) : null}

      <div className="mt-6">
        <MonthCalendar
          label="Dates"
          range={range}
          onChange={(drawn) => {
            setRange(drawn);
            setRefusal(null);
          }}
        />
      </div>

      {/* Whatever room the window has left goes here, so the foot stands at
          the foot of the window. */}
      <div aria-hidden="true" className="min-h-5 flex-1" />

      <div className="flex flex-col gap-3 pt-[14px] pb-[max(24px,env(safe-area-inset-bottom))]">
        <p aria-live="polite" className="text-center text-body/[1.3] font-semibold text-ink-muted tabular-nums">
          {range.end === null ? "Now pick your last day" : formatTripDates(range.start, range.end)}
        </p>
        {refusal !== null && refusal.field === null ? (
          <Notice role="alert" size="meta">
            {refusal.error}
          </Notice>
        ) : null}
        <button type="button" onClick={save} disabled={range.end === null || saving} className={SAVE}>
          {saving ? "Saving" : "Save trip"}
        </button>
      </div>
    </div>
  );
}

/**
 * The row in the trip's menu that opens Edit trip's page over the window. On
 * a phone only: on a desk the name and the dates are changed where they are
 * read, on the name's row. The page is drawn from here, so the menu stays
 * open under it until the page is done, and puts itself away with it.
 */
export function EditTrip(props: EditTripProps) {
  const pages = useMenuPages();
  const [editing, setEditing] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={editing}
        onClick={() => {
          setEditing(true);
        }}
        className={`${MENU_ITEM} lg:hidden`}
      >
        <SheetRow icon={PencilIcon} title="Edit trip" detail="Name, start date and duration" />
      </button>
      {editing ? <EditTripPage {...props} onClose={pages.close} /> : null}
    </>
  );
}
