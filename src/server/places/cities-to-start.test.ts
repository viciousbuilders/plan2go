import { describe, expect, it } from "vitest";
import { visitorCountry } from "./cities-to-start";

const from = (code: string): Headers => new Headers({ "x-vercel-ip-country": code });

describe("visitorCountry", () => {
  it("is the country the platform says the request came from, by its English name", () => {
    expect(visitorCountry(from("VN"))).toBe("Vietnam");
    expect(visitorCountry(from("AU"))).toBe("Australia");
  });

  it("reads the two letters however they are written", () => {
    expect(visitorCountry(from(" us "))).toBe("United States");
  });

  it("is nothing where the platform does not say", () => {
    expect(visitorCountry(new Headers())).toBeNull();
  });

  it("is nothing for what is not a country's two letters", () => {
    expect(visitorCountry(from("QQ"))).toBeNull();
    expect(visitorCountry(from("VNM"))).toBeNull();
    expect(visitorCountry(from("Vietnam"))).toBeNull();
  });
});
