import { describe, expect, it } from "vitest";
import { calendarDate } from "./calendar-date";

const MISSING = "The first day is missing. Enter a date.";

function messages(value: unknown): readonly string[] {
  const parsed = calendarDate(MISSING).safeParse(value);
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
}

describe("calendarDate", () => {
  it("takes a date that exists, as YYYY-MM-DD", () => {
    expect(messages("2026-11-14")).toEqual([]);
    expect(messages("2028-02-29")).toEqual([]);
  });

  it("says a date that does not exist does not", () => {
    expect(messages("2027-02-29")).toEqual(["That date does not exist. Check it."]);
    expect(messages("2026-11-31")).toEqual(["That date does not exist. Check it."]);
  });

  it("refuses anything not shaped like a date with the sentence it was given, and checks nothing past that", () => {
    for (const value of ["14 Nov", "2026-11-14T09:00", "", "2026/11/14"]) {
      expect(messages(value)).toEqual([MISSING]);
    }
  });

  it("refuses what is not text at all with the same sentence", () => {
    expect(messages(undefined)).toEqual([MISSING]);
    expect(messages(20261114)).toEqual([MISSING]);
  });
});
