"use client";

import { useRef, useState, useTransition } from "react";
import type { DayPlan } from "@/core/model/day";
import { ConfirmDialog } from "@/ui/confirm-dialog";
import { ResetIcon, TrashIcon } from "@/ui/icons";
import { Notice } from "@/ui/notice";
import type { DayActions } from "./day-actions";
import type { DayQuestion } from "./day-removal";
import { canReset, deleteQuestion, resetQuestion } from "./day-removal";

interface DayFootProps {
  /** Every day of the trip in order, for what taking one off moves. */
  readonly days: readonly DayPlan[];
  /** The open day, by its place in the trip. */
  readonly index: number;
  readonly actions: Pick<DayActions, "clearDay" | "deleteDay">;
}

/** Which of the two words asked the question, which is where the focus goes back to. */
type Asker = "reset" | "delete";

/**
 * A word and its glyph, with no edge of its own: the two are the quietest
 * things on the day, under everything planned on it. On a phone each answers
 * a finger over 44px, 13px above and below its words, and takes back the same
 * 13px as it is laid out, so it stands only as tall as its words and the
 * room round it is the room it is given, not the finger's.
 */
const ACTION =
  "flex items-center gap-[6px] rounded-pill text-small font-semibold disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta max-lg:-my-[13px] max-lg:py-[13px]";

/**
 * What can be done to the open day as a whole, at its foot, under the last
 * thing on it: start it over, or take it off the trip. Both ask first, in the
 * product's own question over the page, saying exactly what goes and what
 * moves, since neither can be taken back and both can take a whole day's
 * planning with them.
 *
 * Starting it over is offered only to a day with something to start over.
 * Taking it off is offered on every day, and on a trip's only day the
 * question says it cannot go, offering a reset instead when there is one.
 * While either is being written its word says so, and neither can be pressed
 * again; a refusal is said under them.
 */
export function DayFoot({ days, index, actions }: DayFootProps) {
  const day = days[index];
  const [asked, setAsked] = useState<{ readonly by: Asker; readonly question: DayQuestion } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [working, startWorking] = useTransition();
  const [doing, setDoing] = useState<"reset" | "delete">("reset");
  const resetButton = useRef<HTMLButtonElement | null>(null);
  const deleteButton = useRef<HTMLButtonElement | null>(null);

  if (day === undefined) {
    return null;
  }

  const ask = (by: Asker): void => {
    setAsked({
      by,
      question: by === "reset" ? resetQuestion(day, index + 1) : deleteQuestion(days, index),
    });
  };

  /** Put away with nothing done, the focus back on the word that asked. */
  const putAway = (): void => {
    const by = asked?.by;
    setAsked(null);
    (by === "reset" ? resetButton : deleteButton).current?.focus();
  };

  const run = (does: "reset" | "delete"): void => {
    setAsked(null);
    setError(null);
    setDoing(does);
    startWorking(async () => {
      const outcome = await (does === "reset" ? actions.clearDay() : actions.deleteDay());
      setError(outcome.error);
    });
  };

  const question = asked?.question ?? null;

  return (
    <div className="mt-4 print:hidden">
      {/* Centred under the day, under the middle of the cards and rows above
          them, 16px under the last of them, on a desk and a phone alike. */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
        {canReset(day) ? (
          <button
            ref={resetButton}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={asked?.by === "reset"}
            disabled={working}
            onClick={() => {
              ask("reset");
            }}
            className={`${ACTION} text-ink-muted hover:text-ink`}
          >
            <ResetIcon size={14} strokeWidth={2.75} />
            {working && doing === "reset" ? "Resetting" : "Reset this day"}
          </button>
        ) : null}
        <button
          ref={deleteButton}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={asked?.by === "delete"}
          disabled={working}
          onClick={() => {
            ask("delete");
          }}
          className={`${ACTION} text-terracotta-700 hover:text-terracotta-900`}
        >
          <TrashIcon size={14} strokeWidth={2.75} />
          {working && doing === "delete" ? "Deleting" : "Delete this day"}
        </button>
      </div>

      {error === null ? null : (
        <Notice role="alert" size="meta" className="mt-2">
          {error}
        </Notice>
      )}

      {question === null ? null : (
        <ConfirmDialog
          label={question.label}
          question={question.question}
          detail={question.detail}
          cancel={question.cancel}
          confirm={
            question.does === null ? null : question.does === "reset" ? "Reset day" : "Delete day"
          }
          onConfirm={() => {
            if (question.does !== null) {
              run(question.does);
            }
          }}
          onClose={putAway}
        />
      )}
    </div>
  );
}
