"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/ui/icons";

/** How long the button shows its tick before it offers to copy again. */
const COPIED_MILLIS = 1600;

type CopyState = "ready" | "copied" | "refused";

interface CopyBoxProps {
  /** What the box shows and the button copies. */
  readonly text: string;
  /** What the button copies, as a screen reader hears it: "the address". */
  readonly what: string;
  /**
   * Code, in the code face on the page's own ground and broken wherever a
   * line runs out, or a sentence to paste, in the body face on the lightest
   * card, ringed, as the AI box draws it on the page's own ground.
   */
  readonly kind: "code" | "words";
}

/**
 * Something to copy, with a round button in its top corner that copies it,
 * drawn as a pair of sheets and as a tick for a moment once it has. Where the
 * browser keeps the clipboard from the page, the words are selected instead,
 * for the keyboard to copy, and a sentence under them says so.
 */
export function CopyBox({ text, what, kind }: CopyBoxProps) {
  const [state, setState] = useState<CopyState>("ready");
  const words = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (state !== "copied") {
      return;
    }
    const timer = setTimeout(() => {
      setState("ready");
    }, COPIED_MILLIS);
    return () => {
      clearTimeout(timer);
    };
  }, [state]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      const onPage = words.current;
      const selection = window.getSelection();
      if (onPage !== null && selection !== null) {
        const range = document.createRange();
        range.selectNodeContents(onPage);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setState("refused");
    }
  };

  const copied = state === "copied";

  return (
    <div>
      <div
        className={
          kind === "code"
            ? "relative rounded-2xl bg-paper py-3.5 pr-14 pl-4"
            : "relative rounded-[20px] bg-sheet py-3 pr-12 pl-4 ring-2 ring-neutral-200"
        }
      >
        <div ref={words}>
          {kind === "code" ? (
            <pre className="font-mono text-[13px] leading-normal font-medium break-all whitespace-pre-wrap text-ink">
              {text}
            </pre>
          ) : (
            <p className="text-[13px] leading-normal font-medium text-pretty text-ink [overflow-wrap:anywhere]">
              {text}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label={`Copy ${what}`}
          title={copied ? "Copied" : "Copy"}
          onClick={() => {
            void copy();
          }}
          className={`absolute grid place-items-center rounded-pill hover:bg-terracotta-100 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${
            kind === "code" ? "top-1.5 right-1.5 size-10" : "top-1.5 right-1.5 size-9"
          } ${copied ? "text-sage-800" : "text-terracotta-700"}`}
        >
          {copied ? (
            <CheckIcon size={18} strokeWidth={2.75} />
          ) : (
            <CopyIcon size={18} strokeWidth={2.75} />
          )}
        </button>
      </div>
      <p
        role="status"
        className={state === "refused" ? "mt-2 text-[13px] leading-normal text-ink-muted" : "sr-only"}
      >
        {copied
          ? `Copied ${what}.`
          : state === "refused"
            ? "Could not reach the clipboard. The text is selected, copy it from there."
            : ""}
      </p>
    </div>
  );
}
