"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
// zod/mini, by name: this file reaches the browser, and the classic import
// carries every locale zod has with it. See export-query.ts.
import { array, nullable, object, optional, safeParse, string } from "zod/mini";
import { useOutsidePress } from "@/ui/use-outside-press";

/** Long enough that typing does not spend money on every letter. */
const DEBOUNCE_MS = 250;

const MINIMUM_LETTERS = 2;

const suggestionSchema = object({
  providerPlaceId: string(),
  name: string(),
  address: nullable(string()),
});

const responseSchema = object({ suggestions: array(suggestionSchema) });

const refusalSchema = object({ error: string(), action: optional(string()) });

/** A city picked out of the list. */
export interface ChosenCity {
  readonly providerPlaceId: string;
  readonly name: string;
  /** The line the provider writes underneath: the country, which tells two Barcelonas apart. */
  readonly address: string | null;
}

/**
 * What the list says while it is looking and when it finds nothing. Both name
 * what is being looked for, since the field itself says only "Next stop".
 */
const LOOKING = "Looking for cities.";
const NO_MATCH = "No city matches that. Check the spelling.";

/** Tailwind's md, from which the ticket is laid out as on a desk. */
const WIDE = "(min-width: 48rem)";

function watchWidth(onChange: () => void): () => void {
  const wide = window.matchMedia(WIDE);
  wide.addEventListener("change", onChange);
  return () => {
    wide.removeEventListener("change", onChange);
  };
}

interface StopSearchProps {
  /** Whether no stop is on the ticket yet, which decides what the empty field offers. */
  readonly first: boolean;
  readonly onAdd: (city: ChosenCity) => void;
}

/**
 * The next stop, searched rather than typed: a trip needs somewhere real, a
 * place the map can open on and whose clock the days keep, and a line of
 * text is neither. The answers are whole cities, from anywhere, each with the
 * country it is in under its name.
 *
 * Picking one puts it on the ticket at a day and empties the field for the
 * next, with the cursor still in it, so a trip of five cities is five names
 * typed one after another. Enter takes the city picked out in the list, the
 * first until the arrow keys move it, and never sends the ticket: the ticket
 * goes when the button on its stub is pressed.
 *
 * Drawn as each design has it. On a desk, a line to write on after the last
 * stop, with "Press Enter to add" under it once something is typed. On a
 * phone, the row under the last stop on the line the stops run down, its dot
 * dashed since the stop is not there yet, with Add at its end once something
 * is typed, since a phone's keyboard has no Enter to read as an add.
 */
export function StopSearch({ first, onAdd }: StopSearchProps) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<readonly ChosenCity[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** The text the list on screen is an answer to. */
  const [answered, setAnswered] = useState<string | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  /** Answers can arrive out of order, so only the newest is allowed to land. */
  const newest = useRef(0);
  const id = useId();
  const fieldId = `${id}-field`;
  const listId = `${id}-cities`;
  /**
   * Whether the ticket is a desk's, for the words in the empty field. A desk's
   * has no dot in front of it, so the plus is written there instead. Taken as
   * a desk's on the server, which cannot know, and settled once the browser
   * has said.
   */
  const wide = useSyncExternalStore(
    watchWidth,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );

  const trimmed = query.trim();
  const searched = trimmed.length >= MINIMUM_LETTERS;
  const searching = searched && answered !== trimmed;
  const listed = open && found.length > 0;
  const picked = listed ? found[active] : undefined;

  useEffect(() => {
    if (!searched) {
      return;
    }
    const timer = setTimeout(() => {
      const attempt = newest.current + 1;
      newest.current = attempt;

      // Whole cities, never places inside one: this field answers where a
      // trip goes, and the places in each are chosen from inside the trip.
      const parameters = new URLSearchParams({ q: trimmed, kind: "city" });

      const run = async (): Promise<void> => {
        const response = await fetch(`/api/places/search?${parameters.toString()}`);
        const body: unknown = await response.json().catch(() => null);
        if (attempt !== newest.current) {
          return;
        }
        setAnswered(trimmed);
        setOpen(true);
        if (!response.ok) {
          const refusal = safeParse(refusalSchema, body);
          setFound([]);
          setMessage(
            refusal.success
              ? [refusal.data.error, refusal.data.action].filter(Boolean).join(" ")
              : "Could not reach the place search service. Try again in a moment.",
          );
          return;
        }
        const parsed = safeParse(responseSchema, body);
        setFound(parsed.success ? parsed.data.suggestions : []);
        setActive(0);
        setMessage(null);
      };

      void run();
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [trimmed, searched]);

  useOutsidePress(container, open, () => {
    setOpen(false);
  });

  const add = (city: ChosenCity): void => {
    onAdd(city);
    // An answer still on its way is to a question nobody is asking any more.
    newest.current += 1;
    setQuery("");
    setFound([]);
    setAnswered(null);
    setOpen(false);
    field.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      // The field is inside the ticket's form, and Enter there would send it.
      event.preventDefault();
      if (picked !== undefined) {
        add(picked);
      } else if (searched) {
        setOpen(true);
      }
      return;
    }
    if (!listed) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((at) => (at + 1) % found.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((at) => (at === 0 ? found.length - 1 : at - 1));
    }
  };

  const empty = first ? "First stop" : "Next stop";

  return (
    <div
      ref={container}
      className="relative grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-3 md:flex md:flex-col md:items-start md:gap-2"
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 justify-self-center rounded-pill border-[2.5px] border-dashed border-terracotta md:hidden"
      />
      <label htmlFor={fieldId} className="sr-only">
        Add a stop
      </label>
      <input
        ref={field}
        id={fieldId}
        type="text"
        role="combobox"
        autoComplete="off"
        enterKeyHint="done"
        aria-expanded={listed}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={picked === undefined ? undefined : `${listId}-${String(active)}`}
        value={query}
        placeholder={wide ? `+ ${empty}` : empty}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        // 21 on a phone, never under 16, or iOS zooms the page into the field.
        className="h-11 w-full rounded-none border-0 border-b-2 border-dashed border-ink/22 bg-transparent p-0 font-display text-[21px] leading-none font-semibold text-ink caret-terracotta outline-none placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-terracotta md:h-10 md:w-[200px] md:text-[25px]"
      />
      {query.trim() === "" ? null : (
        <button
          type="button"
          disabled={picked === undefined}
          onClick={() => {
            if (picked !== undefined) {
              add(picked);
            }
          }}
          className="h-10 rounded-pill bg-terracotta px-4 text-[14px] leading-none font-bold text-sheet hover:bg-terracotta-600 active:bg-terracotta-700 disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-terracotta md:hidden"
        >
          Add
        </button>
      )}
      {/* Its room kept whether or not there is anything to say, so the line
          of stops does not grow and shrink as the field is typed in. */}
      <span className="flex h-7 items-center text-[13px] leading-none font-medium text-ink-muted max-md:hidden">
        {query.trim() === "" ? "" : "Press Enter to add"}
      </span>

      {open && searched ? (
        <div className="absolute top-full right-0 left-0 z-10 mt-2 rounded-panel border border-rule bg-paper-raised p-[7px] shadow-md md:right-auto md:w-[min(320px,calc(100vw-3rem))]">
          {listed ? (
            <ul id={listId} role="listbox" aria-label="Cities">
              {found.map((city, index) => (
                <li
                  key={city.providerPlaceId}
                  id={`${listId}-${String(index)}`}
                  role="option"
                  aria-selected={index === active}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => {
                      setActive(index);
                    }}
                    onClick={() => {
                      add(city);
                    }}
                    className={`block w-full rounded-chip px-[11px] py-2 text-left ${
                      index === active ? "bg-terracotta-100" : ""
                    }`}
                  >
                    <span className="block text-[14px] leading-[1.3] font-semibold text-ink">
                      {city.name}
                    </span>
                    {city.address === null ? null : (
                      <span className="block text-[12.5px] leading-[1.3] text-ink-muted">
                        {city.address}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-[11px] py-[10px] text-[13px] leading-[1.35] text-ink-muted">
              {message ?? (searching ? LOOKING : NO_MATCH)}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
