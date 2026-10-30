import { useState, useTransition } from "react";
import type { DayPlan } from "@/core/model/day";
import type { LatLng } from "@/core/model/place";
import { FlagIcon, HomeIcon } from "@/ui/icons";
import type { DayActions } from "./day-actions";

/**
 * How each end of the day is marked. The same sage for both, so they are one
 * kind of thing against the stops' terracotta, and a different glyph so they
 * are told apart: a house is where the day sets out from, which is most often
 * where the traveller is staying, and a flag is where it finishes.
 */
export const MARKS = {
  start: HomeIcon,
  end: FlagIcon,
} as const;

/** What each end of the day is called, wherever it has to be said out loud. */
export const ENDS = {
  start: {
    add: "Add start point",
    hint: "Hotel, home or pickup",
    label: "Where the day starts",
    change: "Change where the day starts",
    remove: "Remove where the day starts",
    removePoint: "Remove start point",
    removingPoint: "Removing start point",
  },
  end: {
    add: "Add end point",
    hint: "Hotel, station or airport",
    label: "Where the day ends",
    change: "Change where the day ends",
    remove: "Remove where the day ends",
    removePoint: "Remove end point",
    removingPoint: "Removing end point",
  },
} as const;

/**
 * Where to look first when choosing an end of this day: somewhere the day
 * already goes, so a search for "the station" answers with the one nearby,
 * and on a day with nothing on it yet the city the day is in, so a search for
 * a hotel answers with the ones there and not with a chain's best known
 * anywhere in the world. Null only on a trip with no city at all.
 */
export function nearestPoint(day: DayPlan): LatLng | null {
  const first = day.stops[0];
  if (first !== undefined) {
    return first.place.position;
  }
  return day.start?.place.position ?? day.end?.place.position ?? day.city?.position ?? null;
}

/** One end of a day being changed: its search open or not, and the write that settles it. */
export interface EndEdit {
  readonly picking: boolean;
  readonly setPicking: (picking: boolean) => void;
  /** Whether a change to this end is being written down. */
  readonly saving: boolean;
  readonly error: string | null;
  /** The place chosen for this end, or null to take it off the day. */
  readonly write: (providerPlaceId: string | null) => void;
}

/**
 * Changing one end of a day from a desk's row: the search that opens under
 * it, and the write that settles it. A phone's day finds an end in the search
 * on the map instead, and takes it off from the place's sheet. A reader who
 * cannot edit has no actions, and nothing is written for them.
 */
export function useEndEdit(which: "start" | "end", actions: DayActions | null): EndEdit {
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const write = (providerPlaceId: string | null): void => {
    if (actions === null) {
      return;
    }
    setPicking(false);
    const change = actions.setDayEndpoint;
    startSaving(async () => {
      setError((await change({ which, providerPlaceId })).error);
    });
  };

  return { picking, setPicking, saving, error, write };
}

/** What the search on the map says while it is finding one end of a day. */
export interface EndSearchWords {
  /** After the list's heading: "where Day 1 starts". */
  readonly heading: string;
  /** The plus on a row, read out: "Start Day 1 at The Old Clare Hotel". */
  readonly add: (name: string) => string;
  /** The plus's tooltip, and the button in a place's sheet: "Start Day 1 here". */
  readonly title: string;
  /** That button while it is being done: "Starting Day 1 here". */
  readonly busy: string;
  /** Said to a screen reader once it is done: "Day 1 now starts at The Old Clare Hotel". */
  readonly done: (name: string) => string;
}

/**
 * The words for finding one end of a day in the search on a phone's map,
 * which "Add start point" and "Add end point" go to there, as "Add a place"
 * does. The search is the stops' own, so it says which end it is finding and
 * for which day wherever it would otherwise say it adds to the day: in its
 * list's heading, on each row's plus and on the button in a place's sheet.
 */
export function endSearchWords(which: keyof typeof ENDS, dayName: string): EndSearchWords {
  const start = which === "start";
  return {
    heading: `where ${dayName} ${start ? "starts" : "ends"}`,
    add: (name) => `${start ? "Start" : "End"} ${dayName} at ${name}`,
    title: `${start ? "Start" : "End"} ${dayName} here`,
    busy: `${start ? "Starting" : "Ending"} ${dayName} here`,
    done: (name) => `${dayName} now ${start ? "starts" : "ends"} at ${name}`,
  };
}
