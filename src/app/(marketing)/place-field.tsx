"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
// zod/mini, by name: this file reaches the browser, and the classic import
// carries every locale zod has with it. See export-query.ts.
import { array, nullable, object, optional, safeParse, string } from "zod/mini";
import { SearchIcon } from "@/ui/icons";
import { useOutsidePress } from "@/ui/use-outside-press";
import { useScrollBar } from "@/ui/use-scroll-bar";
import { FIELD_GROUND, FIELD_LABEL, FIELD_SHELL, FIELD_STACK } from "./field-styles";

/** Long enough that typing does not spend money on every letter. */
const DEBOUNCE_MS = 250;

const MINIMUM_LETTERS = 2;

const suggestionSchema = object({
  providerPlaceId: string(),
  name: string(),
  address: nullable(string()),
});

/** How both lists come: the cities a search found, and the cities known the world over. */
const responseSchema = object({ suggestions: array(suggestionSchema) });

const refusalSchema = object({ error: string(), action: optional(string()) });

/** A place the traveller has picked out of the list, whatever it is a place of. */
export interface ChosenPlace {
  readonly providerPlaceId: string;
  readonly name: string;
  /** The line the provider writes underneath: a country, or a street. */
  readonly address: string | null;
}

/**
 * A control's height, which the input inside fills, so the field is as tall
 * as the button under it whatever the text in it. Set further in on a desk,
 * where the card has the room.
 */
const FIELD = `${FIELD_SHELL} flex h-14 items-center gap-3 px-5 focus-within:border-terracotta-300 md:px-6`;

/**
 * What the panel says while it is looking and when it finds nothing. Both name
 * the thing being searched for, because "nothing matched" in a form of several
 * fields does not say which of them is being answered.
 */
const LOOKING = "Looking for cities.";
const NO_MATCH = "No city matches that. Check the spelling.";

/**
 * Over the cities the empty field offers, so they are not taken for the
 * answer to anything typed.
 */
const SUGGESTED = "Suggested cities";

/**
 * The cities known the world over, which the empty field offers, or none.
 * Never throws, and every refusal is an offer of none: nobody asked for this
 * list out loud, so the field says nothing about one it never got, and typing
 * a city still works.
 */
async function askForWorldCities(): Promise<readonly ChosenPlace[]> {
  try {
    const response = await fetch("/api/places/cities/world");
    const parsed = response.ok ? safeParse(responseSchema, await response.json()) : null;
    return parsed === null || !parsed.success ? [] : parsed.data.suggestions;
  } catch {
    return [];
  }
}

interface PlaceFieldProps {
  readonly id: string;
  /** Submitted with the form. What is stored is the provider's own identifier. */
  readonly name: string;
  readonly label: string;
  readonly placeholder: string;
  readonly chosen: ChosenPlace | null;
  readonly onChange: (place: ChosenPlace | null) => void;
}

/**
 * The city a trip is in, searched rather than typed.
 *
 * A trip needs somewhere real: the map has to open on it, and a search inside
 * the trip has to know which Central Market is meant, neither of which is
 * possible from a line of text. The answers are whole cities, from anywhere:
 * the country each is in is written under its name, which is the one place
 * the difference between two Barcelonas matters.
 *
 * Before anything is typed it offers cities known the world over instead,
 * under a heading that says they are suggestions, for a reader with nowhere
 * in mind yet. One picked from them is picked as one searched for is, and
 * the field holding it offers them again when it is reached for.
 */
export function PlaceField({ id, name, label, placeholder, chosen, onChange }: PlaceFieldProps) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<readonly ChosenPlace[]>([]);
  /**
   * The cities known the world over, which the field offers before anything
   * is typed in it, or null until they have answered.
   */
  const [world, setWorld] = useState<readonly ChosenPlace[] | null>(null);
  /**
   * Whether the city in the field was picked from the cities offered rather
   * than from a search, so reaching for the field again brings back the list
   * it was picked from.
   */
  const [pickedOffered, setPickedOffered] = useState(false);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** The text the list on screen is an answer to. */
  const [answered, setAnswered] = useState<string | null>(null);
  const container = useRef<HTMLDivElement | null>(null);
  /** Answers can arrive out of order, so only the newest is allowed to land. */
  const newest = useRef(0);
  /**
   * Whether the cities offered have been asked for, so they are asked for once
   * however often the field is reached for. A ref, because the effect that
   * asks may not set state on the way in, only in the answer.
   */
  const askedForWorld = useRef(false);
  /** The list on screen, whose rows the arrow keys bring into its sight. */
  const list = useRef<HTMLUListElement | null>(null);
  /** Clear of the panel's rounded corners, which would clip the ends of a thumb run into them. */
  const watchList = useScrollBar("y", { inset: 14 });
  const listId = `${useId()}-places`;

  const trimmed = query.trim();
  const searched = trimmed.length >= MINIMUM_LETTERS;
  const searching = searched && answered !== trimmed;
  /**
   * The list is the cities offered rather than the cities found: nothing is
   * typed, or the field holds a city picked from them, as it was picked.
   */
  const offering =
    trimmed === "" || (pickedOffered && chosen !== null && chosen.name === trimmed);
  const rows: readonly ChosenPlace[] = offering ? (world ?? []) : searched ? found : [];

  useEffect(() => {
    // A picked place writes its own name into the field. Searching for that
    // name would answer with the place already chosen and open the list back
    // over the answer, so a name that is already the answer is not a question.
    if (!searched || chosen?.name === trimmed) {
      return;
    }
    const timer = setTimeout(() => {
      const attempt = newest.current + 1;
      newest.current = attempt;

      // Whole cities, never places inside one: this field answers where a trip
      // is, and the places on it are chosen from inside the trip.
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
  }, [trimmed, searched, chosen]);

  /**
   * The cities the empty field offers, asked for as the field is reached for,
   * the pointer coming onto it or the cursor going into it, and not as the
   * page opens: somebody who never reaches for the field should never cause
   * it. On its way before the press rather than after it, and usually a read
   * of what the server kept. A list that did not come is kept as an empty
   * one, so the field stops saying it is looking and leaves finding the city
   * to the typing.
   */
  const lookUpWorld = (): void => {
    if (askedForWorld.current) {
      return;
    }
    askedForWorld.current = true;
    void askForWorldCities().then(setWorld);
  };
  const lookingUpWorld = useEffectEvent(lookUpWorld);
  // Asked for as well when the panel opens on them, for a field reached by
  // the keys rather than the pointer.
  useEffect(() => {
    if (open && offering) {
      lookingUpWorld();
    }
  }, [open, offering]);

  useOutsidePress(container, open, () => {
    setOpen(false);
  });

  const pick = (place: ChosenPlace): void => {
    // An answer still on its way is to a question nobody is asking any more,
    // and landing it would open the list back over the place just picked.
    newest.current += 1;
    onChange(place);
    setQuery(place.name);
    // The field now holds a place that was picked rather than a question
    // waiting on an answer, so nothing is left looking.
    setAnswered(place.name);
    setPickedOffered(offering);
    setOpen(false);
  };

  /**
   * Picks out a row from the keys, with the list scrolled as far as it needs
   * to show it, since a list longer than the panel has rows out of sight.
   */
  const moveTo = (index: number): void => {
    setActive(index);
    list.current?.children.item(index)?.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    // A city typed and not yet picked is a question, not an answer. Sent as
    // it stands the form would only be told the city is missing, so Enter
    // picks from the list when there is one and brings the list back when
    // it has been put away or is still on its way.
    if (event.key === "Enter" && chosen === null && searched) {
      event.preventDefault();
      const picked = open ? rows[active] : undefined;
      if (picked !== undefined) {
        pick(picked);
      } else {
        setOpen(true);
      }
      return;
    }
    if (rows.length === 0 || !open) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveTo((active + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveTo(active === 0 ? rows.length - 1 : active - 1);
    } else if (event.key === "Enter") {
      const picked = rows[active];
      if (picked !== undefined) {
        event.preventDefault();
        pick(picked);
      }
    }
  };

  const listed = open && rows.length > 0;
  /**
   * Whether the panel is up, with cities in it or a sentence. The cities
   * offered have a sentence only while they are on their way, and an offer of
   * none shows nothing at all.
   */
  const shown = open && (offering ? world === null || world.length > 0 : searched);
  /** The cities offered are on screen, under the heading that says what they are. */
  const headed = listed && offering;

  /**
   * The row Enter takes, brought into the list's sight as the list comes up,
   * since it can be a city picked from further down than the panel shows.
   */
  const showActive = useEffectEvent(() => {
    list.current?.children.item(active)?.scrollIntoView({ block: "nearest" });
  });
  useEffect(() => {
    if (listed) {
      showActive();
    }
  }, [listed]);

  return (
    <div className={`relative ${FIELD_STACK}`} ref={container}>
      <label className={FIELD_LABEL} htmlFor={id}>
        {label}
      </label>
      <input type="hidden" name={name} value={chosen?.providerPlaceId ?? ""} />

      <div className={`${FIELD} ${FIELD_GROUND}`}>
        <SearchIcon size={18} strokeWidth={2.75} className="shrink-0 text-terracotta-700" />
        <input
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={listed}
          aria-controls={listId}
          aria-autocomplete="list"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            // The first row is the one Enter takes, until the arrow keys move
            // it, in whichever list the words bring up.
            setActive(0);
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
          }}
          onPointerEnter={lookUpWorld}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] leading-6 text-ink caret-terracotta outline-none placeholder:text-ink-faint"
        />
      </div>

      {shown ? (
        <div className="absolute top-full right-0 left-0 z-30 mt-2 overflow-hidden rounded-panel border border-rule bg-paper-raised shadow-md">
          {/* Outside the rows' scroll, so it stays where it is while they go
              out of sight under it, and with room of its own beneath, so a
              row going is cut clear of its words rather than against them. */}
          {headed ? (
            <p className="px-5 pt-3 pb-2 text-[12px] leading-4 font-semibold text-ink-muted">
              {SUGGESTED}
            </p>
          ) : null}

          {/* Five cities and half of the next at most, the half saying there
              are more, which scroll inside the panel; less on a window with
              little height to spare. A row is 56px, a control's height, and a
              search answers with five at most, so its list never scrolls.
              Scrolled to by the keys with its padding kept, so the first and
              last rows stand where they do at rest. */}
          <div
            ref={watchList}
            className={`scroll-line max-h-[min(calc(5.5*56px),45dvh)] overflow-y-auto overscroll-contain px-2 pb-2 scroll-pb-2 ${
              headed ? "" : "pt-2 scroll-pt-2"
            }`}
          >
            {listed ? (
              <ul
                ref={list}
                id={listId}
                role="listbox"
                aria-label={offering ? SUGGESTED : label}
              >
                {rows.map((place, index) => (
                  <li
                    key={place.providerPlaceId}
                    role="option"
                    aria-selected={place.providerPlaceId === chosen?.providerPlaceId}
                  >
                    {/* Picked out by the pointer moving over it, and not by
                        it arriving: the keys scroll the list under a pointer
                        standing still, and the row that came under it would
                        take the pick back from them. */}
                    <button
                      type="button"
                      onMouseMove={() => {
                        setActive(index);
                      }}
                      onClick={() => {
                        pick(place);
                      }}
                      className={`block w-full rounded-chip px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta ${
                        index === active ? "bg-terracotta-100" : ""
                      }`}
                    >
                      <span className="block text-[14px] leading-5 font-semibold text-ink">
                        {place.name}
                      </span>
                      {place.address === null ? null : (
                        <span className="block text-[13px] leading-5 text-ink-muted">
                          {place.address}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-3 text-[14px] leading-5 text-ink-muted">
                {offering ? LOOKING : (message ?? (searching ? LOOKING : NO_MATCH))}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
