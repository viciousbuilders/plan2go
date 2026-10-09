"use client";

import type { KeyboardEvent } from "react";
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
// zod/mini, by name: this file reaches the browser, and the classic import
// carries every locale zod has with it. See export-query.ts.
import { array, nullable, object, optional, safeParse, string } from "zod/mini";
import { foldedName } from "@/core/model/place-name";
import { PinIcon } from "@/ui/icons";
import { useOutsidePress } from "@/ui/use-outside-press";
import { FIELD_LABEL } from "./ticket-type";

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

/**
 * The towns near a city and the best known cities in its country, nearest
 * first. Each comes with how far it is, which the list leaves unsaid.
 */
const nearSchema = object({ cities: array(suggestionSchema) });

/** The best known cities in the reader's country, or the world's when that is not known. */
const startSchema = object({ country: nullable(string()), cities: array(suggestionSchema) });

/** A city picked out of the list. */
export interface ChosenCity {
  readonly providerPlaceId: string;
  readonly name: string;
  /** The line the provider writes underneath: the country, which tells two Barcelonas apart. */
  readonly address: string | null;
}

/** The cities the empty field offers, and the words over them: "Suggested cities", "Popular in Vietnam". */
interface Offer {
  readonly heading: string;
  readonly cities: readonly ChosenCity[];
}

/**
 * What the list says while it is looking and when it finds nothing. Both name
 * what is being looked for, since the field itself says only "Next stop".
 */
const LOOKING = "Looking for cities.";
const NO_MATCH = "No city matches that. Check the spelling.";

/** As many cities as the empty field offers, which is as many as a search answers with. */
const OFFERED = 5;

/**
 * The towns near a city asked for, as many as the route gives: the ticket's
 * own cities come out of them, and five still have to be left once they have.
 */
const NEAR_ASKED = 20;

/** What the empty field's offer is kept under on a ticket with no city yet. */
const NO_CITY_YET = "start";

/** Tailwind's md, from which the ticket is laid out as on a desk. */
const WIDE = "(min-width: 48rem)";

/** Between the field's line and the list, the mt-2 or mb-2 it is drawn with. */
const LIST_GAP = 8;

/** Room the list keeps from either end of the page. */
const PAGE_ROOM = 8;

/**
 * How tall the list is at its tallest, five cities, the most the search
 * answers and the most the empty field offers: its padding, its heading, and
 * five rows of 48px, 2px apart.
 */
const LIST_HEIGHT = 293;

/** Which side of the field the list hangs on, and how tall it may be there. */
interface Hang {
  readonly above: boolean;
  readonly room: number;
}

function watchWidth(onChange: () => void): () => void {
  const wide = window.matchMedia(WIDE);
  wide.addEventListener("change", onChange);
  return () => {
    wide.removeEventListener("change", onChange);
  };
}

/**
 * A country as a sentence says it after "in": "Vietnam", and with the word an
 * English sentence puts in front of some, "the United States", "the
 * Netherlands".
 */
function inCountry(country: string): string {
  return /^United |(Republic|Islands|Territories)$|^(Netherlands|Philippines|Bahamas|Gambia|Maldives|Seychelles|Comoros)$/.test(
    country,
  )
    ? `the ${country}`
    : country;
}

/**
 * The cities the empty field offers: the towns near the city the next stop
 * follows and the best known in its country, nearest first, or on a ticket
 * with no city yet, the best known in the reader's country, or the world's
 * where that is not known. Never throws, and every refusal is an offer of
 * nothing: nobody asked for this list out loud, so the field says nothing
 * about one it never got, and typing a city still works.
 */
async function offerFor(after: ChosenCity | null): Promise<Offer> {
  const nothing: Offer = { heading: "", cities: [] };
  try {
    if (after === null) {
      const response = await fetch(`/api/places/cities/start?limit=${String(OFFERED)}`);
      const parsed = response.ok ? safeParse(startSchema, await response.json()) : null;
      if (parsed === null || !parsed.success) {
        return nothing;
      }
      const { country, cities } = parsed.data;
      return {
        heading: country === null ? "Popular cities" : `Popular in ${inCountry(country)}`,
        cities,
      };
    }
    const parameters = new URLSearchParams({
      city: after.providerPlaceId,
      limit: String(NEAR_ASKED),
    });
    const response = await fetch(`/api/places/cities?${parameters.toString()}`);
    const parsed = response.ok ? safeParse(nearSchema, await response.json()) : null;
    return parsed === null || !parsed.success
      ? nothing
      : { heading: "Suggested cities", cities: parsed.data.cities };
  } catch {
    return nothing;
  }
}

interface StopSearchProps {
  /**
   * The city the stop being searched for comes after, whose towns the empty
   * field offers, or null for the first stop.
   */
  readonly after: ChosenCity | null;
  /** Every city on the ticket, none of which the empty field offers again. */
  readonly taken: readonly ChosenCity[];
  /**
   * The city of the stop whose city is being changed, which the field stands
   * in place of, or null for the field the next stop is added in.
   */
  readonly changing: ChosenCity | null;
  readonly onChoose: (city: ChosenCity) => void;
  /**
   * The field left with no city chosen in it, while a stop's city is being
   * changed: from the keys, by Escape or Tab, or by a press anywhere else,
   * which has put the cursor where it wanted it.
   */
  readonly onLeave?: (fromKeys: boolean) => void;
}

/**
 * A stop's city, searched rather than typed: a trip needs somewhere real, a
 * place the map can open on and whose clock the days keep, and a line of
 * text is neither. The answers are whole cities, from anywhere, each with the
 * country it is in under its name.
 *
 * Before anything is typed it offers cities instead, as the cursor goes into
 * it: the towns near the city the stop comes after and the best known in its
 * country, nearest first, and none the ticket already goes to. For a first
 * stop, the best known cities in the country the reader is in, as far as
 * their connection says, and where it does not say, cities known the world
 * over.
 *
 * Two fields are this one. The next stop's, after the last on the ticket: a
 * city goes on the ticket when it is pressed in the list, on a phone as on a
 * desk, at a day, and the field empties for the next with the cursor still in
 * it and the list still up, offering the towns near the city just chosen, so
 * a trip of five cities is five names typed or picked one after another. And
 * a stop's own, in place of its name once the name is pressed, empty and
 * showing the name as its words: the city chosen in it is the stop's city
 * from then on, at the same days, and the field goes, as it does when it is
 * left with nothing chosen.
 *
 * Enter takes the city picked out in the list, the first until the arrow keys
 * move it, and never sends the ticket: the ticket goes when the button on its
 * stub is pressed.
 *
 * Drawn as each design has it. On a desk, a line to write on. On a phone, the
 * next stop's is the row under the last stop on the line the stops run down,
 * its dot dashed since the stop is not there yet.
 *
 * The list hangs 8px under the field, or over it where the page has no room
 * for five cities under it before its foot, as the departure calendar does,
 * and is never taller than the room on its side, so it never runs the page
 * on past either end. It is drawn as that calendar is: raised paper rounded
 * at 20px under the same shadow, "Matching cities" or what the cities offered
 * are in the ticket's small capitals, and each city a row a finger's height,
 * a pin in the accent before its name and its country under that. On a desk
 * it is the calendar's 320px and starts 8px left of the field, which is
 * 240px for the next stop, so the list stands a third wider than the words
 * typed into it, and as wide as the name it stands over for a stop's own; on
 * a phone it is as wide as the field, and the dot stands outside it.
 */
export function StopSearch({ after, taken, changing, onChoose, onLeave }: StopSearchProps) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<readonly ChosenCity[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** The text the list on screen is an answer to. */
  const [answered, setAnswered] = useState<string | null>(null);
  /**
   * The cities the empty field offers, by the city they are near, once each
   * has answered. Kept for as long as the ticket is here, so taking the last
   * stop off offers the towns near the one before it again at once.
   */
  const [offers, setOffers] = useState<Readonly<Record<string, Offer>>>({});
  /**
   * Worked out as the list opens and kept while it is open, so it does not
   * change sides as the answers come in and the list grows.
   */
  const [hang, setHang] = useState<Hang>({ above: false, room: LIST_HEIGHT });
  const container = useRef<HTMLDivElement | null>(null);
  /** The field's line, which the list hangs from. */
  const line = useRef<HTMLDivElement | null>(null);
  const field = useRef<HTMLInputElement | null>(null);
  /** Answers can arrive out of order, so only the newest is allowed to land. */
  const newest = useRef(0);
  /**
   * The offers asked for and not answered yet, so each is asked for once
   * however often the field is reached for. A ref, because the effect that
   * asks may not set state on the way in, only in the answer.
   */
  const asking = useRef(new Set<string>());
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

  const offerKey = after?.providerPlaceId ?? NO_CITY_YET;

  const trimmed = query.trim();
  const searched = trimmed.length >= MINIMUM_LETTERS;
  const searching = searched && answered !== trimmed;
  /** Nothing typed, so the list is the cities offered rather than the cities found. */
  const blank = trimmed === "";
  const offer = offers[offerKey];
  /** The cities offered, less every city on the ticket, by its identifier or by its name. */
  const offered = (offer?.cities ?? [])
    .filter(
      (city) =>
        !taken.some(
          (onTicket) =>
            onTicket.providerPlaceId === city.providerPlaceId ||
            foldedName(onTicket.name) === foldedName(city.name),
        ),
    )
    .slice(0, OFFERED);
  const rows: readonly ChosenCity[] = searched ? found : blank ? offered : [];
  const listed = open && rows.length > 0;
  /** The row Enter takes, the first until the arrow keys or the pointer move it. */
  const at = active < rows.length ? active : 0;
  const picked = listed ? rows[at] : undefined;
  /**
   * Whether the list is up, with cities in it or a sentence. The cities
   * offered have a sentence only while they are on their way, and an offer of
   * none shows nothing at all.
   */
  const shown = open && (searched || (blank && (offer === undefined || offered.length > 0)));
  const heading = searched ? "Matching cities" : (offer?.heading ?? "");
  /** What the list says when it has no cities in it. */
  const sentence = searched ? (message ?? (searching ? LOOKING : NO_MATCH)) : LOOKING;

  /**
   * Under the field where the page has room for five cities before its foot,
   * else on whichever side has more room, and no taller than that room. Again
   * whenever the window changes size while the list is up, and when a city
   * chosen from it moves the field on.
   */
  useLayoutEffect(() => {
    if (!shown) {
      return;
    }
    const hangIt = (): void => {
      const box = line.current?.getBoundingClientRect();
      if (box === undefined) {
        return;
      }
      const page = document.body.getBoundingClientRect();
      const under = page.bottom - PAGE_ROOM - (box.bottom + LIST_GAP);
      const over = box.top - LIST_GAP - (page.top + PAGE_ROOM);
      const above = under < LIST_HEIGHT && over > under;
      setHang({ above, room: Math.max(0, above ? over : under) });
    };
    hangIt();
    window.addEventListener("resize", hangIt);
    return () => {
      window.removeEventListener("resize", hangIt);
    };
  }, [shown, offerKey]);

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

  /**
   * The cities the empty field offers, asked for as the field is reached for,
   * the pointer coming onto it or the cursor going into it, and not as the
   * page opens: somebody who never reaches for the field should never cause
   * it. Usually a read of what the server kept, and on its way before the
   * press rather than after it. A list that did not come is kept as an empty
   * one, so the field stops saying it is looking and leaves finding the city
   * to the typing.
   */
  const lookUpOffer = (): void => {
    const key = offerKey;
    if (offers[key] !== undefined || asking.current.has(key)) {
      return;
    }
    asking.current.add(key);
    void offerFor(after).then((answer) => {
      asking.current.delete(key);
      setOffers((now) => ({ ...now, [key]: answer }));
    });
  };
  const lookingUpOffer = useEffectEvent(lookUpOffer);
  // Again whenever the city the stop comes after changes while the list is
  // up, as it does the moment a next stop is chosen from it.
  useEffect(() => {
    if (open) {
      lookingUpOffer();
    }
  }, [open, offerKey]);

  useOutsidePress(container, open, () => {
    setOpen(false);
    onLeave?.(false);
  });

  const choose = (city: ChosenCity): void => {
    // An answer still on its way is to a question nobody is asking any more.
    newest.current += 1;
    onChoose(city);
    if (changing !== null) {
      // The field goes with the change.
      return;
    }
    setQuery("");
    setFound([]);
    setAnswered(null);
    setActive(0);
    // Left up, to offer the towns near the city just chosen for the stop after it.
    setOpen(true);
    field.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    // Tab takes the cursor on, and the list would be left over whatever it
    // goes to. A stop's own field goes as it is left, so the cursor goes back
    // to the name it stood in place of, rather than on from a field no longer
    // there.
    if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      if (onLeave !== undefined) {
        event.preventDefault();
        onLeave(true);
      }
      return;
    }
    if (event.key === "Enter") {
      // The field is inside the ticket's form, and Enter there would send it.
      event.preventDefault();
      if (picked !== undefined) {
        choose(picked);
      } else {
        setOpen(true);
      }
      return;
    }
    if (!listed) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((at + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(at === 0 ? rows.length - 1 : at - 1);
    }
  };

  const empty = taken.length === 0 ? "First stop" : "Next stop";

  // The field's line, which the list hangs from.
  const fieldLine = (
    <div ref={line} className="relative grid grid-cols-[minmax(0,1fr)] items-center md:flex">
      <label htmlFor={fieldId} className="sr-only">
        {changing === null ? "Add a stop" : `Change ${changing.name} to`}
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
        aria-activedescendant={picked === undefined ? undefined : `${listId}-${String(at)}`}
        // A stop's own field takes the cursor as it takes the name's place,
        // during the press that put it there, so a phone opens its keyboard.
        autoFocus={changing !== null}
        value={query}
        placeholder={changing?.name ?? (wide ? `+ ${empty}` : empty)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        // A press on the field it already has the cursor in, after Escape
        // put the list away, brings it back.
        onClick={() => {
          setOpen(true);
        }}
        onPointerEnter={lookUpOffer}
        onKeyDown={onKeyDown}
        // 20, never under 16, or iOS zooms the page into the field.
        // No ring round it: the caret, in the accent, says it has the cursor.
        className={`h-11 w-full rounded-none border-0 border-b-2 border-dashed border-ink/22 bg-transparent p-0 font-display text-[20px] leading-none font-semibold text-ink caret-terracotta outline-none placeholder:text-ink-faint md:h-9 ${
          changing === null ? "md:w-[240px]" : ""
        }`}
      />

      {shown ? (
        // The calendar's surface, corners and shadow, the shadow in the
        // accent's darkest brown as the ticket's own is.
        <div
          style={{ maxHeight: hang.room }}
          className={`absolute right-0 left-0 z-20 overflow-y-auto overscroll-contain rounded-[20px] bg-paper-raised p-2 shadow-[0_18px_40px_color-mix(in_srgb,var(--color-terracotta-900)_18%,transparent)] md:right-auto md:-left-2 md:w-[320px] ${
            hang.above ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {listed ? (
            <>
              <p className={`${FIELD_LABEL} px-3 pt-2.5 pb-2`}>{heading}</p>
              <ul
                id={listId}
                role="listbox"
                aria-label={searched ? "Cities" : heading}
                className="flex flex-col gap-0.5"
              >
                {rows.map((city, index) => (
                  <li
                    key={city.providerPlaceId}
                    id={`${listId}-${String(index)}`}
                    role="option"
                    aria-selected={index === at}
                    onMouseEnter={() => {
                      setActive(index);
                    }}
                    // The row Enter takes, tinted, and rounded to sit 8px
                    // inside the panel's own corners.
                    className={`rounded-[12px] ${index === at ? "bg-terracotta-100" : ""}`}
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => {
                        choose(city);
                      }}
                      className="flex min-h-12 w-full items-center gap-3 rounded-[12px] py-1.5 pr-3 pl-[11px] text-left"
                    >
                      <PinIcon size={18} strokeWidth={2.75} className="flex-none text-terracotta" />
                      <span className="min-w-0">
                        <span className="block text-[14px] leading-[18px] font-bold text-ink">{city.name}</span>
                        {city.address === null ? null : (
                          <span className="mt-0.5 block text-[12px] leading-4 text-ink-muted">
                            {city.address}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="px-3 py-3 text-[13px] leading-[1.4] text-ink-muted">{sentence}</p>
          )}
        </div>
      ) : null}
    </div>
  );

  // A stop's own field stands where its name stood. The next stop's has, on a
  // phone, the dashed dot of a stop not there yet in front of it.
  return changing === null ? (
    <div
      ref={container}
      className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-3 md:flex"
    >
      <span
        aria-hidden="true"
        className="h-3 w-3 justify-self-center rounded-pill border-[2.5px] border-dashed border-terracotta md:hidden"
      />
      {fieldLine}
    </div>
  ) : (
    <div ref={container}>{fieldLine}</div>
  );
}
