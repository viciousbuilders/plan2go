import { describe, expect, it } from "vitest";
import { WEEK_ROW, WEEK_ROW_LEAST, weekRowFor } from "./calendar-fit";

/** The front page's calendar without its weeks: the line with the steps, the months' names and their days' names. */
const REST = 118;

describe("weekRowFor", () => {
  it("keeps a week at its own size where six fit under the field", () => {
    expect(weekRowFor(420, REST, 6)).toBe(WEEK_ROW);
  });

  it("keeps a week at its own size where six fit exactly", () => {
    expect(weekRowFor(REST + 6 * WEEK_ROW, REST, 6)).toBe(WEEK_ROW);
  });

  it("draws a week shorter where six would run past the window's foot", () => {
    // 1440 by 763: 324px from the top of the calendar to 16px above the foot.
    expect(weekRowFor(324, REST, 6)).toBe(34);
  });

  it("rounds down, so six weeks never come to more than the room", () => {
    const row = weekRowFor(301, REST, 6);
    expect(REST + 6 * row).toBeLessThanOrEqual(301);
  });

  it("never draws a week under its least, leaving the rest to scroll", () => {
    expect(weekRowFor(238, REST, 6)).toBe(WEEK_ROW_LEAST);
  });
});
