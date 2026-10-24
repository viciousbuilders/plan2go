"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/ui/icons";
import type { AppId } from "./app-guides";
import { APP_GUIDES } from "./app-guides";

/**
 * The live site, the address the root layout gives as metadataBase. The page
 * is built once and served as it is, so this is the address it arrives with,
 * until the browser says where it is really being read.
 */
const LIVE_ORIGIN = "https://plan2go.vietbrosinaus.com";

/** Where every deployment serves its MCP server, the route in src/app/api/mcp. */
const MCP_PATH = "/api/mcp";

/** How far one press of an arrow moves the row of apps, in pixels: two or three tabs. */
const STEP_PX = 160;

/** How far the tabs fade out towards an end with more of the row beyond it, in pixels. */
const FADE_PX = 40;

/** Scrolled less than this from an end counts as at it, against rounding. */
const AT_END_PX = 4;

/** Where the page is being read from never changes while it is open, so nothing is listened for. */
function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * Where the page is being read from: the live site, a preview or a dev
 * server, each of which serves an MCP server of its own, so the address
 * an app is given is the one in front of the reader.
 */
function useOrigin(): string {
  return useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => LIVE_ORIGIN,
  );
}

/** Whether the reader has asked for movement to be kept to a minimum. */
function keepStill(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * How to add plan2go to the app the reader talks to an assistant in, one app
 * at a time under tabs, since each adds a server its own way: a connector in
 * its settings, a command in a terminal, or a link that opens the app on its
 * own offer to add it. Claude first, since every plan there can add it, and
 * the catch-all last, for any other app that speaks MCP.
 *
 * Tabs as the pattern has them: the arrow keys, Home and End move between
 * them and show the one they land on, and only the one shown is on the way
 * Tab goes through the page, its panel next. Every panel is always there, the
 * ones not shown hidden, so each tab's panel is there to point to.
 *
 * The tabs are one row that scrolls sideways rather than wrapping, as the
 * planner's quick searches are: where there is more of the row beyond an end,
 * the tabs fade out towards it and a round arrow over it moves the row on.
 * Neither arrow takes the focus, since a tab the keyboard or the pointer
 * chooses is brought clear of the fade on its own.
 */
export function ConnectPlan2go() {
  const origin = useOrigin();
  const [app, setApp] = useState<AppId>("claude");
  const tabs = useRef<Partial<Record<AppId, HTMLButtonElement | null>>>({});
  const row = useRef<HTMLDivElement | null>(null);
  /** Whether there is more of the row of apps beyond each end. */
  const [more, setMore] = useState({ before: false, after: false });
  const id = useId();

  useEffect(() => {
    const strip = row.current;
    if (strip === null) {
      return;
    }
    const measure = (): void => {
      const before = strip.scrollLeft > AT_END_PX;
      const after = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - AT_END_PX;
      setMore((now) => (now.before === before && now.after === after ? now : { before, after }));
    };
    // An observer calls back once as it starts watching, before the row is
    // first painted, and again whenever the row changes width.
    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    strip.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      strip.removeEventListener("scroll", measure);
    };
  }, []);

  const page = (direction: 1 | -1): void => {
    row.current?.scrollBy({ left: direction * STEP_PX, behavior: keepStill() ? "auto" : "smooth" });
  };

  /** Moves the row as little as brings a tab clear of the fade at either end. */
  const reveal = (tab: HTMLElement): void => {
    const strip = row.current;
    if (strip === null) {
      return;
    }
    const box = strip.getBoundingClientRect();
    const edges = tab.getBoundingClientRect();
    const left =
      edges.left < box.left + FADE_PX
        ? edges.left - box.left - FADE_PX
        : edges.right > box.right - FADE_PX
          ? edges.right - box.right + FADE_PX
          : 0;
    if (left !== 0) {
      strip.scrollBy({ left, behavior: keepStill() ? "auto" : "smooth" });
    }
  };

  const choose = (next: AppId, focus: boolean): void => {
    setApp(next);
    const tab = tabs.current[next];
    if (tab === null || tab === undefined) {
      return;
    }
    if (focus) {
      tab.focus({ preventScroll: true });
    }
    reveal(tab);
  };

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
    const at = APP_GUIDES.findIndex((one) => one.id === app);
    const last = APP_GUIDES.length - 1;
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
    const next = to === null ? undefined : APP_GUIDES[to];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    choose(next.id, true);
  };

  const back = more.before ? `transparent 0, #000 ${String(FADE_PX)}px` : "#000 0";
  const on = more.after ? `#000 calc(100% - ${String(FADE_PX)}px), transparent 100%` : "#000 100%";
  const fade = `linear-gradient(to right, ${back}, ${on})`;

  return (
    <>
      {/* The page's ground as one pill behind the row, which fades out over
          it, so the pill keeps its ends while the tabs scroll inside. The
          row's padding is room for the chosen tab's shadow and the focus
          ring, which a row that scrolls would otherwise cut off. */}
      <div className="relative max-w-full self-start">
        <div className="rounded-pill bg-paper">
          <div
            ref={row}
            role="tablist"
            aria-label="Your AI app"
            onKeyDown={onKeyDown}
            className="flex overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ maskImage: fade, WebkitMaskImage: fade }}
          >
            {APP_GUIDES.map((one) => {
              const selected = one.id === app;
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
                    choose(one.id, false);
                  }}
                  className={`flex h-7 shrink-0 items-center rounded-pill px-3 text-[13px] leading-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${
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
        </div>

        {more.before ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Scroll back through the apps"
            onClick={() => {
              page(-1);
            }}
            className="absolute top-1/2 left-1 grid size-7 -translate-y-1/2 place-items-center rounded-pill border border-rule bg-paper-raised text-ink shadow-sm hover:bg-paper-sunken"
          >
            <ChevronLeftIcon size={13} strokeWidth={3} />
          </button>
        ) : null}
        {more.after ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Scroll on through the apps"
            onClick={() => {
              page(1);
            }}
            className="absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center rounded-pill border border-rule bg-paper-raised text-ink shadow-sm hover:bg-paper-sunken"
          >
            <ChevronRightIcon size={13} strokeWidth={3} />
          </button>
        ) : null}
      </div>

      {APP_GUIDES.map(({ id: one, Guide, help }) => (
        <div
          key={one}
          role="tabpanel"
          id={`${id}-${one}-panel`}
          aria-labelledby={`${id}-${one}-tab`}
          hidden={one !== app}
          className="flex flex-col gap-4 [&[hidden]]:hidden"
        >
          <Guide address={address} shownAddress={shownAddress} />
          {help === null ? null : (
            <p className="text-[13px] leading-5 text-ink-muted">
              If your screen looks different,{" "}
              <a
                href={help.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-terracotta-700 underline underline-offset-2 hover:text-terracotta-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
              >
                {help.name}
              </a>{" "}
              has the latest steps.
            </p>
          )}
        </div>
      ))}
    </>
  );
}
