"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon } from "@/ui/icons";

/**
 * The live site, the address the root layout gives as metadataBase. The page
 * is built once and served as it is, so this is the address it arrives with,
 * until the browser says where it is really being read.
 */
const LIVE_ORIGIN = "https://plan2go.vietbrosinaus.com";

/** Where every deployment serves its MCP server, the route in src/app/api/mcp. */
const MCP_PATH = "/api/mcp";

/** How long a button says it has copied before it offers to copy again. */
const COPIED_MILLIS = 2000;

/**
 * A trip asked for the way a person would ask: where and for how long, who
 * is going, how full the days should be, and the link to send the others.
 */
const EXAMPLE_PROMPT =
  "Use plan2go to plan five days in Tokyo next month for a family with two kids. Put three or four places on each day, keep the travel between them short, and give me the read only link to share.";

const HINT = "text-[14px] leading-[1.5] text-pretty text-ink-muted";

/** Where the page is being read from never changes while it is open, so nothing is listened for. */
function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * Where the page is being read from: the live site, a preview or a dev
 * server, each of which serves an MCP server of its own, so the address
 * Claude is given is the one in front of the reader.
 */
function useOrigin(): string {
  return useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => LIVE_ORIGIN,
  );
}

type CopyState = "ready" | "copied" | "refused";

interface CopyBoxProps {
  /** What the button copies, and what is shown unless `shown` says otherwise. */
  readonly text: string;
  /**
   * The text as it is shown, where that differs: with the places a narrow box
   * may wrap a command marked, which copying leaves out.
   */
  readonly shown?: ReactNode;
  /** What the button copies, as a screen reader hears it: "the Claude Code command". */
  readonly what: string;
  /** Whether it is code, set in the monospace face, rather than words to Claude. */
  readonly code: boolean;
}

/**
 * Something to copy, and the button that copies it. Where the browser keeps
 * the clipboard from the page, the words are selected instead, for the
 * keyboard to copy, and a sentence under them says so.
 *
 * The button stands beside the words while the box has room for both, and
 * under them once it is narrower than that, as on a phone or in two columns
 * on a narrow window, so the words keep the box's whole width. Measured on
 * the box rather than the window, since the columns change its width too.
 */
function CopyBox({ text, shown = text, what, code }: CopyBoxProps) {
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
      <div className="flex items-start gap-3 rounded-panel border border-rule bg-paper-raised py-3 pr-3 pl-4 @max-sm:flex-col @max-sm:items-stretch">
        <div ref={words} className="min-w-0 flex-1 py-[5px]">
          {code ? (
            // Within a word only where the word is wider than the box.
            <code className="font-mono text-[13px] leading-[1.6] text-ink [overflow-wrap:anywhere]">
              {shown}
            </code>
          ) : (
            <p className="text-[15px] leading-[1.6] text-pretty text-ink">{shown}</p>
          )}
        </div>
        <button
          type="button"
          aria-label={`Copy ${what}`}
          onClick={() => {
            void copy();
          }}
          className={`inline-flex shrink-0 items-center gap-1 rounded-pill border border-rule bg-paper px-3 py-[7px] text-[13px] leading-none font-semibold hover:border-rule-strong hover:text-ink active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta @max-sm:self-end ${
            state === "copied" ? "text-terracotta-700" : "text-ink-muted"
          }`}
        >
          {state === "copied" ? <CheckIcon size={12} strokeWidth={3} /> : null}
          {state === "copied" ? "Copied" : "Copy"}
        </button>
      </div>
      <p role="status" className={state === "refused" ? "mt-2 text-[13px] leading-[1.5] text-ink-muted" : "sr-only"}>
        {state === "copied"
          ? `Copied ${what}.`
          : state === "refused"
            ? "Could not reach the clipboard. The text is selected, copy it from there."
            : ""}
      </p>
    </div>
  );
}

/** A small heading over a column, and what is under it. */
function Column({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-[19px] leading-[1.3] font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

/**
 * The other way to plan a trip: by asking Claude, which reaches plan2go
 * through the MCP server every deployment serves. Under the hero rather than
 * in it, which keeps to its headline, its one sentence and its form.
 *
 * How to connect it on one side, under what the product is, and what to ask
 * on the other, under the form, in the same two columns as the hero and
 * stacking where they do. Each line copies with a press.
 */
export function PlanWithClaude() {
  const origin = useOrigin();
  const address = `${origin}${MCP_PATH}`;
  // Free to wrap before its path, so a narrow box keeps the scheme with the
  // host and puts the path on a line of its own.
  const shownAddress = (
    <>
      {origin}
      <wbr />
      {MCP_PATH}
    </>
  );
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h2
          id={headingId}
          className="font-display text-[clamp(24px,2.4vw,30px)] leading-[1.2] font-semibold text-ink"
        >
          Plan it with Claude
        </h2>
        <p className="max-w-[58ch] text-[16px] leading-[1.65] text-pretty text-ink-muted">
          Add plan2go to Claude and ask for a trip in your own words. Claude opens it, fills the
          days with places and checks every travel time.
        </p>
      </div>

      <div className="grid items-start gap-14 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <Column title="Connect plan2go">
          <div className="flex flex-col gap-2">
            <p className={HINT}>
              In claude.ai or the Claude app, add a custom connector in Settings, under
              Connectors, with this address:
            </p>
            <CopyBox text={address} shown={shownAddress} what="the connector address" code />
          </div>
          <div className="flex flex-col gap-2">
            <p className={HINT}>For Claude Code, run this in a terminal:</p>
            {/* The flag kept whole: the page wraps its lines prettily, moving
                words down to lengthen the last one, and took the flag apart
                at its hyphens to do it. */}
            <CopyBox
              text={`claude mcp add --transport http plan2go ${address}`}
              shown={
                <>
                  claude mcp add <span className="whitespace-nowrap">--transport</span> http
                  plan2go {shownAddress}
                </>
              }
              what="the Claude Code command"
              code
            />
          </div>
        </Column>

        <Column title="Ask for a trip">
          <div className="flex flex-col gap-2">
            <p className={HINT}>Then try something like:</p>
            <CopyBox text={EXAMPLE_PROMPT} what="the example prompt" code={false} />
          </div>
        </Column>
      </div>
    </section>
  );
}
