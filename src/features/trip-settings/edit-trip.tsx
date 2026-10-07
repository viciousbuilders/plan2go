"use client";

import { useId, useRef, useState, useTransition } from "react";
import { PencilIcon } from "@/ui/icons";
import { MENU_ITEM } from "@/ui/menu";
import { Notice } from "@/ui/notice";
import { useLocalToday } from "@/ui/use-local-today";
import { DateRangeField } from "./date-range-field";
import { SheetRow } from "./sheet-row";
import { useMenuPages } from "./trip-menu";
import type { TripSettingsOutcome } from "./trip-settings";
import { UNSAVED } from "./trip-settings";

/**
 * Which field, over it: the interface's own tier in bold, as a label over a
 * value, the way the share page names its links.
 */
const LABEL = "text-small/none font-semibold text-ink";

/**
 * The name's field, drawn as the dates' pill under it is: raised paper inside
 * a hairline, darkening under the pointer and taking the accent's edge while
 * it is being typed in or was refused. 16px, as every field on a phone is,
 * since iOS zooms the whole page into a field set any smaller.
 */
const NAME_FIELD =
  "w-full rounded-pill border border-rule bg-paper-raised px-4 py-3 text-[16px]/none font-semibold text-ink caret-terracotta outline-none placeholder:text-ink-faint hover:border-rule-strong focus-visible:border-terracotta aria-invalid:border-terracotta";

/** The one way the page is left with something written: the accent's solid pill, across the sheet. */
const SAVE =
  "w-full rounded-pill bg-terracotta px-5 py-3 text-body font-semibold text-paper hover:bg-terracotta-600 active:bg-terracotta-700 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

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
 * the menu's sheet: the name in a field, the dates in the pill that opens the
 * calendar, and Save under them. Nothing is written until Save is pressed, so
 * leaving the page by its arrow, or putting the sheet away, leaves the trip
 * as it was. Once it is saved the sheet goes, and the page under it is the
 * trip as it now is.
 *
 * Saved by hand rather than by a form: the menu is drawn inside the form on
 * the name's row, and a form cannot hold another.
 */
function EditTripPage({ slug, editKey, title, startDate, endDate, onSave }: EditTripProps) {
  const pages = useMenuPages();
  const today = useLocalToday();
  const fieldId = useId();
  const [name, setName] = useState(title);
  const [first, setFirst] = useState(startDate);
  const [last, setLast] = useState(endDate);
  /** What the save said when it refused, until anything on the page changes. */
  const [refusal, setRefusal] = useState<TripSettingsOutcome | null>(null);
  const [saving, startSaving] = useTransition();
  const changed = name !== title || first !== startDate || last !== endDate;

  const save = (): void => {
    if (!changed || saving) {
      return;
    }
    const form = new FormData();
    form.set("slug", slug);
    form.set("editKey", editKey);
    form.set("title", name);
    form.set("startDate", first);
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
        Name
      </label>
      {/* Not `required`, for the reason the name's row gives: empty is
          refused by the save, in the product's own sentence. */}
      <input
        id={`${fieldId}-name`}
        type="text"
        maxLength={80}
        value={name}
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
        className={`mt-[6px] ${NAME_FIELD}`}
      />
      {refusal?.field === "title" ? (
        <Notice role="alert" size="meta" className="mt-2">
          {refusal.error}
        </Notice>
      ) : null}

      {/* The field's own label is the one read out; this one is for the eye. */}
      <p aria-hidden="true" className={`mt-4 ${LABEL}`}>
        Dates
      </p>
      <div className="mt-[6px]">
        <DateRangeField
          id={`${fieldId}-dates`}
          label="Dates"
          start={first}
          end={last}
          today={today}
          onChange={(range) => {
            setFirst(range.start);
            setLast(range.end);
            setRefusal(null);
          }}
          size="sheet"
        />
      </div>

      <button type="button" onClick={save} disabled={!changed || saving} className={`mt-5 ${SAVE}`}>
        {saving ? "Saving" : "Save"}
      </button>
      {refusal !== null && refusal.field === null ? (
        <Notice role="alert" size="meta" className="mt-2">
          {refusal.error}
        </Notice>
      ) : null}
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
          title: "Edit trip",
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
