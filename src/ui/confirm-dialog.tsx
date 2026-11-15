"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * An answer to the question, the height of the menu's own button: the question
 * stands alone in the middle of the page, and answers sized for a popover
 * looked lost under it, while the product's standing buttons outweighed the
 * one line they answered.
 */
const ANSWER =
  "inline-flex h-[34px] items-center justify-center rounded-pill px-4 text-small/none font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

/** The answer that destroys something is the one that carries the accent, and the only one in a pill. */
const CONFIRM = `${ANSWER} bg-terracotta text-paper hover:bg-terracotta-600 active:bg-terracotta-700`;

/** The way out is a word beside it, not a second shape competing with it. */
const CANCEL = `${ANSWER} text-ink-muted hover:bg-neutral-200 hover:text-ink`;

interface ConfirmDialogProps {
  /** What the dialog is called, to a screen reader. */
  readonly label: string;
  /** The question, as the panel's heading. */
  readonly question: string;
  /** What answering it does, said under the question before it is answered. */
  readonly detail: ReactNode;
  /** The answer that changes nothing. */
  readonly cancel: string;
  /** The answer that does it, or null for a question that can only be put away. */
  readonly confirm: string | null;
  readonly onConfirm: () => void;
  /**
   * Put away with nothing done: by the way out, by Escape, or by a press on
   * the page behind. Whoever asked hands the focus back to what asked.
   */
  readonly onClose: () => void;
}

/**
 * A question asked before something that cannot be taken back, in the middle
 * of the page, over the whole of it, with the page dimmed and softened
 * behind: a question that cannot be left half answered, and the ground going
 * quiet is what says so. Drawn in the product's own panel rather than in a
 * browser dialog in a system's palette, on a page that is meant to read like
 * a printed guide. Rendered only while it is being asked.
 *
 * The way out takes the focus as it opens, so a keyboard arriving at the
 * question lands on the answer that changes nothing.
 *
 * Put at the root of the document rather than where it was asked from, so it
 * lies over a menu it was asked from too: inside it, the dimming could only
 * reach what was beneath the menu, and the row the question came from stayed
 * lit and sharp above the page it was asking about. Every press in it is kept
 * from the document, since a menu closes on a press outside itself, and being
 * at the root this is outside it.
 */
export function ConfirmDialog({
  label,
  question,
  detail,
  cancel,
  confirm,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const way = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    way.current?.focus();
  }, []);

  return createPortal(
    <div
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* The page behind, dimmed and softened, and closing the question when
          clicked: everything that is not the question is the way out of it. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/30 backdrop-blur-[3px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            // One layer per press: the question closes and whatever it was
            // asked from stays, with the focus back where it came from.
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
        className="relative w-[min(360px,calc(100vw-2rem))] rounded-panel border border-rule bg-paper-raised p-[18px] text-left shadow-lg"
      >
        {/* The question as a heading at the lead step, the one the export
            dialog's heading is set at, since the two are the product's
            panels that stand in the middle of the page, and under it what
            answering does. The answers sit at the right, the way out first
            and the deed last. Six under the question, because what follows
            finishes it rather than starting anything; sixteen over the
            answers, which are a different thing again. */}
        <p className="font-display text-lead text-ink">{question}</p>
        <p className="mt-[6px] text-body text-ink-muted">{detail}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" ref={way} onClick={onClose} className={CANCEL}>
            {cancel}
          </button>
          {confirm === null ? null : (
            <button type="button" onClick={onConfirm} className={CONFIRM}>
              {confirm}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
