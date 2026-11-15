import { describe, expect, it } from "vitest";
import type { DayClear, DayCleared, TripRepository } from "../repositories/trip-repository";
import { clearDay } from "./clear-day";

const NOT_STUBBED = "This stub only answers the clear question.";

/** Records each clear it is asked for, and answers with what it was told to. */
function repositoryAnswering(answer: DayCleared): {
  readonly repository: TripRepository;
  readonly clears: DayClear[];
} {
  const clears: DayClear[] = [];
  const unstubbed = (): Promise<never> => Promise.reject(new Error(NOT_STUBBED));
  return {
    clears,
    repository: {
      findBySlug: unstubbed,
      findEditKeyHash: unstubbed,
      create: unstubbed,
      updateSettings: unstubbed,
      delete: unstubbed,
      findPlaceByProviderId: unstubbed,
      addStop: unstubbed,
      setDayEndpoint: unstubbed,
      setDayStart: unstubbed,
      setDayCity: unstubbed,
      swapDays: unstubbed,
      clearDay: (clear) => {
        clears.push(clear);
        return Promise.resolve(answer);
      },
      deleteDay: unstubbed,
      setLegMode: unstubbed,
      updateStop: unstubbed,
      removeStop: unstubbed,
      moveStop: unstubbed,
      moveStopToDay: unstubbed,
    },
  };
}

describe("clearDay", () => {
  it("starts the day over, leaving at the hour a new day leaves at", async () => {
    const { repository, clears } = repositoryAnswering({ status: "cleared" });
    const cleared = await clearDay(
      { slug: "amber-quay-4k7n2q9mrv", editKeyHash: "b7f1c0d4e5a6", dayId: "d2" },
      repository,
    );
    expect(cleared).toEqual({ status: "cleared" });
    expect(clears).toEqual([
      {
        slug: "amber-quay-4k7n2q9mrv",
        editKeyHash: "b7f1c0d4e5a6",
        dayId: "d2",
        startAtMinutes: 9 * 60,
      },
    ]);
  });

  it("says what storage says when the key is not this trip's", async () => {
    const { repository } = repositoryAnswering({ status: "refused" });
    const cleared = await clearDay(
      { slug: "amber-quay-4k7n2q9mrv", editKeyHash: "not-the-key", dayId: "d2" },
      repository,
    );
    expect(cleared).toEqual({ status: "refused" });
  });
});
