import type { DayEndpoint } from "@/core/model/day";
import type { TravelMode } from "@/core/model/leg";

/**
 * A marker that is our own DOM rather than Google's.
 *
 * DESIGN.md is specific about these: a stop is a numbered disc with a 2px
 * terracotta ring, an endpoint is a sage square with one corner cut, and both
 * carry a name that is read out but never drawn. Google's own markers take an image, so
 * an OverlayView is what lets the markup and the tokens stay in this repo.
 *
 * The class is built after the script loads, because OverlayView does not exist
 * until then.
 */
export function placeDomMarker(
  maps: typeof google.maps,
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  content: HTMLElement,
): google.maps.OverlayView {
  const overlay = new maps.OverlayView();

  overlay.onAdd = () => {
    overlay.getPanes()?.floatPane.append(content);
  };

  overlay.draw = () => {
    // Typed as always present, but it is not: draw fires before the panes are
    // ready, and again when the map never authenticated at all.
    const projection: google.maps.MapCanvasProjection | undefined = overlay.getProjection();
    if (projection === undefined) {
      return;
    }
    const point = projection.fromLatLngToDivPixel(new maps.LatLng(position));
    if (point === null) {
      return;
    }
    content.style.left = `${String(point.x)}px`;
    content.style.top = `${String(point.y)}px`;
  };

  overlay.onRemove = () => {
    content.remove();
  };

  overlay.setMap(map);
  return overlay;
}

/**
 * Whether something pressed is one of these markers or inside one. They are
 * laid over the map, so a press on one reaches the map under it as well.
 */
export function isOnMarker(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(".trip-map-marker") !== null;
}

/** A numbered stop. Text goes in as text, so nothing has to be escaped. */
export function stopMarkerElement(order: number, name: string): HTMLElement {
  const marker = document.createElement("span");
  marker.className = "trip-map-marker trip-map-stop";

  const number = document.createElement("span");
  number.setAttribute("aria-hidden", "true");
  number.textContent = String(order);

  const spoken = document.createElement("span");
  spoken.className = "trip-map-name";
  spoken.textContent = `Stop ${String(order)}, ${name}`;

  marker.append(number, spoken);
  return marker;
}

/** The pin the search list draws beside each place, and the empty day in its middle. */
const PIN_PATHS = [
  "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z",
  "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
];

/**
 * A place being looked at from a search, not on the day yet. The same pin the
 * search list draws beside each place, drawn large and on nothing: not a disc
 * like a stop, since it has no place in the order, and not ringed, since the
 * map has just gone to it. Its tip is on the place. The glyph is drawn twice,
 * a wide stroke of paper under the terracotta one, so it reads over a road
 * name or a river the way a line with a casing does.
 */
export function candidateMarkerElement(name: string): HTMLElement {
  const marker = document.createElement("span");
  marker.className = "trip-map-marker trip-map-candidate";

  const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  glyph.setAttribute("aria-hidden", "true");
  glyph.setAttribute("viewBox", "0 0 24 24");
  glyph.setAttribute("width", "40");
  glyph.setAttribute("height", "40");
  glyph.setAttribute("fill", "none");
  glyph.setAttribute("stroke-linecap", "round");
  glyph.setAttribute("stroke-linejoin", "round");
  for (const [stroke, width] of [
    ["var(--color-paper)", "5.5"],
    ["currentColor", "2.5"],
  ] as const) {
    for (const d of PIN_PATHS) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", width);
      glyph.append(path);
    }
  }

  const spoken = document.createElement("span");
  spoken.className = "trip-map-name";
  spoken.textContent = `${name}, being looked at`;

  marker.append(glyph, spoken);
  return marker;
}

/** Which end of the day a marker stands for, or both where they are one place. */
export type EndpointKind = "start" | "end" | "both";

/**
 * The same glyphs the panel draws, so a place is one shape wherever it is: a
 * house where the day sets out from, a flag where it finishes. One place that
 * is both gets the house, because there and back is what a house says. Drawn
 * the same on the live map and on the printed one.
 */
export const ENDPOINT_MARKS: Readonly<
  Record<EndpointKind, { readonly word: string; readonly paths: readonly string[] }>
> = {
  start: {
    word: "Start",
    paths: ["m3 10 9-7 9 7v10a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 20Z", "M9.5 21.5v-7h5v7"],
  },
  end: {
    word: "End",
    paths: ["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22v-7"],
  },
  both: {
    word: "Start and end",
    paths: ["m3 10 9-7 9 7v10a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 20Z", "M9.5 21.5v-7h5v7"],
  },
};

/**
 * How an end's glyph is drawn in its marker on the live map. The width is in
 * the glyph's own 24 units, which the size divides down: a stroke drawn as
 * thin as a small marker is small would be a smudge rather than the lines of
 * a house, so it is widened as the glyph narrows. The printed map, whose
 * marks are smaller, keeps its own.
 */
export const ENDPOINT_GLYPH = { size: 13, strokeWidth: 3 } as const;

/**
 * The markers the ends of a day are drawn as, in the order they are drawn: one
 * for a day that starts and ends in the same place rather than two on top of
 * each other, and it answers as the start, since it is the same place.
 */
export function endpointMarks(
  start: DayEndpoint | null,
  end: DayEndpoint | null,
): readonly { readonly endpoint: DayEndpoint; readonly kind: EndpointKind }[] {
  if (start !== null && end !== null && start.place.id === end.place.id) {
    return [{ endpoint: start, kind: "both" }];
  }
  return [
    ...(start === null ? [] : [{ endpoint: start, kind: "start" as const }]),
    ...(end === null ? [] : [{ endpoint: end, kind: "end" as const }]),
  ];
}

/**
 * The glyph each way of getting somewhere is drawn with on its leg, the same
 * ones a leg's row in the panel carries (CarIcon, TrainIcon and WalkIcon),
 * as paths: the car's wheels and the train's body are written out as arcs,
 * since a mark built here draws paths and nothing else.
 */
const LEG_GLYPHS: Readonly<Record<TravelMode, readonly string[]>> = {
  drive: [
    "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",
    "M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
    "M9 17h6",
    "M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  ],
  transit: [
    "M7 3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z",
    "M4 11h16M12 3v8m-4 8-2 3m12 0-2-3",
    "M8 15h.01M16 15h.01",
  ],
  walk: [
    "M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0Z",
    "M20 20v-2.4c0-1.1 1-2.1 1-4.6 0-2.7-1.5-6-4.5-6C14.6 7 14 8.8 14 10.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0Z",
    "M16 17h4M4 13h4",
  ],
};

/** A leg's glyph on its mark, drawn as an end's is and for the same reason. */
const LEG_GLYPH = { size: 13, strokeWidth: 2.75 } as const;

/**
 * How long a leg has to be on screen, end to end, before its mark is drawn on
 * it: the mark's 24px and half of a 26px marker at either end, with room
 * between them, so the mark never sits on the places the leg joins. Shorter,
 * it is left off until the map is zoomed in far enough to hold it.
 */
const LEG_MARK_SPAN = 72;

/**
 * A leg's way, halfway along it, on a phone's map: the glyph its row carries,
 * in the leg's own ink. Not read out, since the leg's row says its way in
 * words, and not pressed: trip-map.css lets a press through to the map.
 */
export function legMarkElement(mode: TravelMode, ink: string): HTMLElement {
  const marker = document.createElement("span");
  marker.className = "trip-map-marker trip-map-leg";
  marker.setAttribute("aria-hidden", "true");
  marker.style.setProperty("--leg-ink", ink);

  const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  glyph.setAttribute("viewBox", "0 0 24 24");
  glyph.setAttribute("width", String(LEG_GLYPH.size));
  glyph.setAttribute("height", String(LEG_GLYPH.size));
  glyph.setAttribute("fill", "none");
  glyph.setAttribute("stroke", "currentColor");
  glyph.setAttribute("stroke-width", String(LEG_GLYPH.strokeWidth));
  glyph.setAttribute("stroke-linecap", "round");
  glyph.setAttribute("stroke-linejoin", "round");
  for (const d of LEG_GLYPHS[mode]) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    glyph.append(path);
  }

  marker.append(glyph);
  return marker;
}

/**
 * A leg's mark laid on the map at a point along it, shown only while the leg's
 * two ends are far enough apart on screen to hold it clear of their markers,
 * which is asked again every time the map is drawn, so zooming in brings it
 * back.
 */
export function placeLegMark(
  maps: typeof google.maps,
  map: google.maps.Map,
  leg: {
    readonly at: google.maps.LatLngLiteral;
    readonly from: google.maps.LatLngLiteral;
    readonly to: google.maps.LatLngLiteral;
  },
  content: HTMLElement,
): google.maps.OverlayView {
  const overlay = new maps.OverlayView();

  overlay.onAdd = () => {
    overlay.getPanes()?.floatPane.append(content);
  };

  overlay.draw = () => {
    // Typed as always present, but it is not, as for every marker here.
    const projection: google.maps.MapCanvasProjection | undefined = overlay.getProjection();
    if (projection === undefined) {
      return;
    }
    const at = projection.fromLatLngToDivPixel(new maps.LatLng(leg.at));
    const from = projection.fromLatLngToDivPixel(new maps.LatLng(leg.from));
    const to = projection.fromLatLngToDivPixel(new maps.LatLng(leg.to));
    if (at === null || from === null || to === null) {
      return;
    }
    content.style.left = `${String(at.x)}px`;
    content.style.top = `${String(at.y)}px`;
    content.style.visibility =
      Math.hypot(to.x - from.x, to.y - from.y) < LEG_MARK_SPAN ? "hidden" : "";
  };

  overlay.onRemove = () => {
    content.remove();
  };

  overlay.setMap(map);
  return overlay;
}

/** An end of the day. Which end decides the glyph and what is read out. */
export function endpointMarkerElement(kind: EndpointKind, name: string): HTMLElement {
  const mark = ENDPOINT_MARKS[kind];
  const marker = document.createElement("span");
  marker.className = "trip-map-marker trip-map-endpoint";

  const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  glyph.setAttribute("aria-hidden", "true");
  glyph.setAttribute("viewBox", "0 0 24 24");
  glyph.setAttribute("width", String(ENDPOINT_GLYPH.size));
  glyph.setAttribute("height", String(ENDPOINT_GLYPH.size));
  glyph.setAttribute("fill", "none");
  glyph.setAttribute("stroke", "currentColor");
  glyph.setAttribute("stroke-width", String(ENDPOINT_GLYPH.strokeWidth));
  glyph.setAttribute("stroke-linecap", "round");
  glyph.setAttribute("stroke-linejoin", "round");
  for (const d of mark.paths) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    glyph.append(path);
  }

  const spoken = document.createElement("span");
  spoken.className = "trip-map-name";
  spoken.textContent = `${mark.word} of the day, ${name}`;

  marker.append(glyph, spoken);
  return marker;
}
