"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { CheckIcon } from "@/ui/icons";

/** How long a button says it has copied before it offers to copy again. */
const COPIED_MILLIS = 2000;

type CopyState = "ready" | "copied" | "refused";

interface CopyBoxProps {
  /** What the button copies, and what is shown unless `shown` says otherwise. */
  readonly text: string;
  /**
   * The text as it is shown, where that differs: with the places a narrow box
   * may wrap a command marked, which copying leaves out.
   */
  readonly shown?: ReactNode;
  /** What the button copies, as a screen reader hears it: "the command". */
  readonly what: string;
  /**
   * Several lines, such as a settings file, kept as they are written rather
   * than wrapped, scrolling sideways where one is wider than the box, with the
   * button level with the first of them.
   */
  readonly lines?: boolean;
}

/**
 * A line of code to copy, on the page's own ground inside the card, and the
 * button that copies it, in the accent's lightest tint. Where the browser
 * keeps the clipboard from the page, the words are selected instead, for the
 * keyboard to copy, and a sentence under them says so.
 *
 * The button stands beside the words while the box has room for both, and
 * under them once it is narrower than that, as on a phone, where the words
 * also come down a size, so the live site's address fits on a line. Measured
 * on the box rather than the window, since the columns change its width too.
 */
export function CopyBox({ text, shown = text, what, lines = false }: CopyBoxProps) {
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

  return (
    <div className="@container">
      {/* 44px with the Copy in it: a small control's 28 and 8 above and
          below, and the line of code as tall as the Copy beside it. */}
      <div
        className={`flex gap-3 rounded-chip bg-paper py-2 pr-2 pl-4 @max-sm:flex-col @max-sm:items-stretch ${
          lines ? "items-start" : "items-center"
        }`}
      >
        <div ref={words} className="min-w-0 flex-1 py-1">
          {/* Within a word only where the word is wider than the box. A block,
              so its own 20px lines set its height and not the taller line of
              the page's text it would otherwise sit on. */}
          <code
            className={`block font-mono text-[13px] leading-5 text-ink @max-sm:text-[12px] ${
              lines ? "scroll-quiet overflow-x-auto whitespace-pre" : "[overflow-wrap:anywhere]"
            }`}
          >
            {shown}
          </code>
        </div>
        <button
          type="button"
          aria-label={`Copy ${what}`}
          onClick={() => {
            void copy();
          }}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-pill bg-terracotta-100 px-3 text-[13px] leading-none font-bold text-terracotta-800 hover:bg-terracotta-200 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta @max-sm:self-end"
        >
          {state === "copied" ? <CheckIcon size={11} strokeWidth={3} /> : null}
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p
        role="status"
        className={state === "refused" ? "mt-2 text-[13px] leading-5 text-ink-muted" : "sr-only"}
      >
        {state === "copied"
          ? `Copied ${what}.`
          : state === "refused"
            ? "Could not reach the clipboard. The text is selected, copy it from there."
            : ""}
      </p>
    </div>
  );
}
