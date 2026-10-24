"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon } from "@/ui/icons";
import { FIELD_HINT } from "./field-styles";

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

/** The two places a reader might use Claude, each with its own way of adding plan2go. */
type Client = "app" | "code";

const CLIENTS: readonly { readonly id: Client; readonly label: string }[] = [
  { id: "app", label: "Claude app" },
  { id: "code", label: "Claude Code" },
];

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
function CopyBox({ text, shown = text, what }: CopyBoxProps) {
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
      <div className="flex items-center gap-3 rounded-chip bg-paper py-2 pr-2 pl-4 @max-sm:flex-col @max-sm:items-stretch">
        <div ref={words} className="min-w-0 flex-1 py-1">
          {/* Within a word only where the word is wider than the box. A block,
              so its own 20px lines set its height and not the taller line of
              the page's text it would otherwise sit on. */}
          <code className="block font-mono text-[13px] leading-5 text-ink [overflow-wrap:anywhere] @max-sm:text-[12px]">
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

/**
 * How to add plan2go to Claude, in the two places a reader might use it: the
 * Claude app, claude.ai among them, which takes the address as a custom
 * connector, and Claude Code, which takes a command in a terminal. One at a
 * time, under tabs, the app first, since that is where most people meet
 * Claude.
 *
 * Tabs as the pattern has them: the arrow keys, Home and End move between
 * them and show the one they land on, and only the one shown is on the way
 * Tab goes through the page, its panel next. Both panels are always there,
 * the one not shown hidden, so each tab's panel is there to point to.
 */
export function ConnectPlan2go() {
  const origin = useOrigin();
  const [client, setClient] = useState<Client>("app");
  const tabs = useRef<Partial<Record<Client, HTMLButtonElement | null>>>({});
  const id = useId();

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

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const at = CLIENTS.findIndex((one) => one.id === client);
    const last = CLIENTS.length - 1;
    const to =
      event.key === "ArrowRight"
        ? at === last
          ? 0
          : at + 1
        : event.key === "ArrowLeft"
          ? at === 0
            ? last
            : at - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    const next = to === null ? undefined : CLIENTS[to];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    setClient(next.id);
    tabs.current[next.id]?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label="Where you use Claude"
        onKeyDown={onKeyDown}
        className="inline-flex self-start rounded-pill bg-paper p-1"
      >
        {CLIENTS.map((one) => {
          const selected = one.id === client;
          return (
            <button
              key={one.id}
              ref={(element) => {
                tabs.current[one.id] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-${one.id}-tab`}
              aria-selected={selected}
              aria-controls={`${id}-${one.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                setClient(one.id);
              }}
              className={`flex h-7 items-center rounded-pill px-3 text-[13px] leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${
                selected
                  ? "bg-paper-raised font-bold text-ink shadow-sm"
                  : "font-semibold text-ink-muted hover:text-ink"
              }`}
            >
              {one.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-app-panel`}
        aria-labelledby={`${id}-app-tab`}
        hidden={client !== "app"}
        className="flex flex-col gap-4 [&[hidden]]:hidden"
      >
        <p className={FIELD_HINT}>
          In claude.ai or the Claude app, add a custom connector in Settings, under Connectors,
          with this address:
        </p>
        <CopyBox text={address} shown={shownAddress} what="the connector address" />
      </div>

      <div
        role="tabpanel"
        id={`${id}-code-panel`}
        aria-labelledby={`${id}-code-tab`}
        hidden={client !== "code"}
        className="flex flex-col gap-4 [&[hidden]]:hidden"
      >
        <p className={FIELD_HINT}>For Claude Code, run this in a terminal:</p>
        {/* The flag kept whole: the page wraps its lines prettily, moving
            words down to lengthen the last one, and took the flag apart at
            its hyphens to do it. */}
        <CopyBox
          text={`claude mcp add --transport http plan2go ${address}`}
          shown={
            <>
              claude mcp add <span className="whitespace-nowrap">--transport</span> http plan2go{" "}
              {shownAddress}
            </>
          }
          what="the Claude Code command"
        />
      </div>
    </>
  );
}
