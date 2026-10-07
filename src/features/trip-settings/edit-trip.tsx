"use client";

import { useId, useRef, useState, useTransition } from "react";
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

/** The one way off the page with something written: the accent's solid pill, across the sheet. */
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
 * The trip's name and dates as a phone changes them, on Edit trip's page of
 * the menu's sheet, which comes up as Share trip's does: under "Plan your
 * trip" and the arrow back to the cards. On it, as design 1b draws the start
 * of a trip less its main city: the name's field, the month to draw the dates
 * on, and under them what has been drawn, the dates and how many days they
 * come to, over Save trip.
 *
 * Nothing is written until Save trip is pressed, and it cannot be until both
 * ends are drawn. Going back to the cards, or putting the sheet away, leaves
 * the trip as it was. Once it is saved the sheet goes, and what is left is
 * the trip as it now is.
 *
 * Saved by hand rather than by a form: the menu is drawn inside the form on
 * the name's row, and a form cannot hold another.
 */
function EditTripPage({ slug, editKey, title, startDate, endDate, onSave }: EditTripProps) {
  const pages = useMenuPages();
  const fieldId = useId();
  const [name, setName] = useState(title);
  const [range, setRange] = useState<DrawnRange>({ start: startDate, end: endDate });
  /** What the save said when it refused, until anything on the page changes. */
  const [refusal, setRefusal] = useState<TripSettingsOutcome | null>(null);
  const [saving, startSaving] = useTransition();

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
        pages.close();
        return;
      }
      setRefusal(outcome);
    });
  };

  return (
    <div className="flex flex-col">
      <label htmlFor={`${fieldId}-name`} className={LABEL}>
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

      <p
        aria-live="polite"
        className="mt-5 text-center text-body/[1.3] font-semibold text-ink-muted tabular-nums"
      >
        {range.end === null ? "Now pick your last day" : formatTripDates(range.start, range.end)}
      </p>
      {refusal !== null && refusal.field === null ? (
        <Notice role="alert" size="meta" className="mt-3">
          {refusal.error}
        </Notice>
      ) : null}
      <button
        type="button"
        onClick={save}
        disabled={range.end === null || saving}
        className={`mt-3 ${SAVE}`}
      >
        {saving ? "Saving" : "Save trip"}
      </button>
    </div>
  );
}

/**
 * The row in the trip's menu that turns the sheet into Edit trip's page. On a
 * phone only: on a desk the name and the dates are changed where they are
 * read, on the name's row. When the page is left, the focus comes back here.
 */
export function EditTrip(props: EditTripProps) {
  const pages = useMenuPages();
  const trigger = useRef<HTMLButtonElement | null>(null);

  return (
    <button
      type="button"
      ref={trigger}
      aria-haspopup="dialog"
      // Whichever page is up, this row is hidden under it, so the only state
      // it is ever read in is the one with no page open.
      aria-expanded={pages.page !== null}
      onClick={() => {
        pages.open({
          title: "Plan your trip",
          content: <EditTripPage {...props} />,
          onBack: () => {
            trigger.current?.focus();
          },
        });
      }}
      className={`${MENU_ITEM} lg:hidden`}
    >
      <SheetRow icon={PencilIcon} title="Edit trip" detail="Name, start date and duration" />
    </button>
  );
}
