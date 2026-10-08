import { describe, expect, it } from "vitest";
import type { StopCity } from "./create-trip";
import { cityOfEachDay } from "./create-trip";

const HANOI: StopCity = { providerPlaceId: "hanoi", name: "Hanoi", position: { lat: 21.03, lng: 105.85 } };
const NINH_BINH: StopCity = {
  providerPlaceId: "ninh-binh",
  name: "Ninh Binh",
  position: { lat: 20.25, lng: 105.97 },
};
const HA_LONG: StopCity = { providerPlaceId: "ha-long", name: "Ha Long", position: { lat: 20.95, lng: 107.07 } };

describe("cityOfEachDay", () => {
  it("gives every day of the first stop the trip's own city, which is none of its own", () => {
    expect(cityOfEachDay([{ city: HANOI, days: 3 }])).toEqual([null, null, null]);
  });

  it("gives each later stop's days that stop's city, in the order the trip goes", () => {
    expect(
      cityOfEachDay([
        { city: HANOI, days: 2 },
        { city: NINH_BINH, days: 1 },
        { city: HA_LONG, days: 2 },
      ]),
    ).toEqual([null, null, NINH_BINH, HA_LONG, HA_LONG]);
  });

  it("gives a stop back in the first city the trip's own city again", () => {
    expect(
      cityOfEachDay([
        { city: HANOI, days: 1 },
        { city: HA_LONG, days: 1 },
        { city: HANOI, days: 2 },
      ]),
    ).toEqual([null, HA_LONG, null, null]);
  });
});
