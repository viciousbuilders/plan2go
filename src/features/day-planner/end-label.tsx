"use client";

import { useRef, useState } from "react";
import { MAX_LABEL_LENGTH } from "@/core/model/day";
import { PlusIcon } from "@/ui/icons";

interface EndLabelProps {
  /** For the name the field is read out by: the label is what somewhere is called. */
  readonly placeName: string;
  /** What the traveller calls the end now, or null when it goes by its place's name. */
  readonly label: string | null;
  /** The kind of place that goes at this end, which the empty field offers as examples. */
  readonly hint: string;
  /** Writes the label, null taking it off. */
  readonly onSave: (label: string | null) => void;
  /** Whether a change to this end is being written down. */
  readonly disabled: boolean;
}

/**
 * What the traveller calls an end of the day, "Hotel", written where the end
 * is read, the way a stop's note is: a field once there is one, and otherwise
 * the one line offering to start it. Leaving the field writes it, as Enter
 * does, and Escape puts it back as it was. Emptied, the end goes back to its
 * place's name alone. The label is said in front of that name wherever the
 * end is drawn, "Hotel, La Siesta Classic Ma May", which is all a reader sees
 * of it; this is for someone who may change it.
 *
 * One line, since a label is a word or two for a point and not a sentence
 * about it, and held to the length one may be.
 */
export function EndLabel({ placeName, label, hint, onSave, disabled }: EndLabelProps) {
  const [writing, setWriting] = useState(false);
  /**
   * The label as it was last sent, held until the trip comes back carrying
   * it, so the field does not blink back to the old one in between, as a
   * note's does not. Undefined means nothing is in flight.
   */
  const [sent, setSent] = useState<string | null | undefined>(undefined);
  /** Escape was pressed, so leaving the field this time writes nothing. */
  const dropped = useRef(false);

  if (sent !== undefined && sent === label) {
    setSent(undefined);
  }
  const shown = sent === undefined ? label : sent;

  const commit = (value: string): void => {
    const tidied = value.trim() === "" ? null : value.trim();
    setWriting(false);
    if (tidied === shown) {
      return;
    }
    setSent(tidied);
    onSave(tidied);
  };

  if (shown === null && !writing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setWriting(true);
        }}
        className="mt-[5px] flex items-center gap-[5px] self-start pr-1 text-micro font-semibold text-ink-muted hover:text-terracotta-700 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta max-lg:min-h-10"
      >
        <PlusIcon size={12} strokeWidth={2.75} />
        Add a label
      </button>
    );
  }

  return (
    <input
      type="text"
      defaultValue={shown ?? ""}
      // Keyed by the label, so one written elsewhere is the one shown.
      key={shown ?? ""}
      autoFocus={writing}
      maxLength={MAX_LABEL_LENGTH}
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        } else if (event.key === "Escape") {
          event.preventDefault();
          dropped.current = true;
          event.currentTarget.blur();
        }
      }}
      onBlur={(event) => {
        if (dropped.current) {
          dropped.current = false;
          event.currentTarget.value = shown ?? "";
          setWriting(false);
          return;
        }
        commit(event.currentTarget.value);
      }}
      placeholder={hint}
      aria-label={`What you call ${placeName}`}
      /* Raised paper, as every field is, on the paper the end is drawn on.
         16px on a phone, where iOS zooms the page into any field set
         smaller as it takes the cursor. */
      className="mt-[6px] w-full max-w-[260px] rounded-chip border border-rule bg-paper-raised px-[11px] py-[6px] text-meta text-ink caret-terracotta outline-none placeholder:text-ink-faint focus-visible:border-terracotta disabled:opacity-45 max-lg:max-w-none max-lg:text-[16px]"
    />
  );
}
