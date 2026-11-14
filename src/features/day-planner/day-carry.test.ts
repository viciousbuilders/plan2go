import { describe, expect, it } from "vitest";
import { carriedBy, slotAlong } from "./day-carry";

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

describe("carriedBy", () => {
  it("goes as far as the pointer has", () => {
    expect(carriedBy(120, 1, slots)).toBe(120);
    expect(carriedBy(-50, 1, slots)).toBe(-50);
  });

  it("stops the day at the first day's start and the last day's end", () => {
    expect(carriedBy(-400, 1, slots)).toBe(-86);
    expect(carriedBy(400, 1, slots)).toBe(172);
  });

  it("goes as far as it is told when the days were never measured", () => {
    expect(carriedBy(30, 1, [])).toBe(30);
  });
});
