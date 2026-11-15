import { describe, expect, it } from "vitest";
import { overTheStrip, slotAlong } from "./day-carry";

/** Four days 82 wide and 4 apart, as a desk's strip lays them. */
const slots = [
  { index: 0, start: 4, end: 86 },
  { index: 1, start: 90, end: 172 },
  { index: 2, start: 176, end: 258 },
  { index: 3, start: 262, end: 344 },
];

describe("slotAlong", () => {
  it("is the day the pointer is over", () => {
    expect(slotAlong(40, slots, 3)).toBe(0);
    expect(slotAlong(300, slots, 1)).toBe(3);
  });

  it("stays on the day it was last over while the pointer is between two", () => {
    expect(slotAlong(88, slots, 0)).toBe(0);
    expect(slotAlong(88, slots, 1)).toBe(1);
  });

  it("is the first day before the strip's days and the last past them", () => {
    expect(slotAlong(-30, slots, 2)).toBe(0);
    expect(slotAlong(500, slots, 1)).toBe(3);
  });
});

describe("overTheStrip", () => {
  /** A desk's strip, a row of days across the top of the panel. */
  const strip = { left: 1040, right: 1400, top: 96, bottom: 152 };

  it("is over the strip anywhere along its row of days, its edges included", () => {
    expect(overTheStrip(1200, 120, strip)).toBe(true);
    expect(overTheStrip(1040, 96, strip)).toBe(true);
    expect(overTheStrip(1400, 152, strip)).toBe(true);
  });

  it("is off it above or below the row, over the trip's name or the day", () => {
    expect(overTheStrip(1200, 60, strip)).toBe(false);
    expect(overTheStrip(1200, 400, strip)).toBe(false);
  });

  it("is off it past either end, over the map or the window's edge", () => {
    expect(overTheStrip(700, 120, strip)).toBe(false);
    expect(overTheStrip(1420, 120, strip)).toBe(false);
  });
});
