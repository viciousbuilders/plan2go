import { createContext, useContext } from "react";

/**
 * A stop being carried off the open day onto another day in the strip. The
 * strip is drawn with the trip's name, apart from the day under it, so what
 * is carried in the one is told to the other through here, by the planner
 * that holds them both.
 */
export interface DayDrop {
  /** Whether a stop is being carried, which is when the other days in the strip take one. */
  readonly carrying: boolean;
  /** The day in the strip the stop is over, by its place in the trip, or null. */
  readonly overDay: number | null;
  readonly setOverDay: (index: number | null) => void;
  /** Lets the stop go on a day in the strip, which puts it last on that day. */
  readonly dropOnDay: (index: number) => void;
}

/** Nothing carried and nowhere to let it go, for a strip drawn with no day under it. */
const NOTHING_CARRIED: DayDrop = {
  carrying: false,
  overDay: null,
  setOverDay: () => undefined,
  dropOnDay: () => undefined,
};

export const DayDropContext = createContext<DayDrop>(NOTHING_CARRIED);

/** What the planner says about a stop being carried to another day. */
export function useDayDrop(): DayDrop {
  return useContext(DayDropContext);
}
