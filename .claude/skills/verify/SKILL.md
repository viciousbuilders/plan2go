---
name: verify
description: How to build, launch and drive plan2go in a real browser to observe a change at its surface. Use when verifying a change in the trip editor, the search field, or the front door.
---

# Verifying plan2go at the surface

## Launch

```
pnpm dev -p <port>          # from plan2go/, reads .env (Neon DB + Google keys)
```

Ready in about two seconds. Any port works for the app, but the Maps browser key is
referrer restricted, so on a port other than the one allowed in the Google Cloud
console the map panel says "The map is not switched on for this address" and the
Next dev overlay shows two issues. The search field, the day list and every server
route still work, so that is fine for anything that is not the map itself.

## Driver

Playwright is not a project dependency. Install it in the scratchpad, not here, and
launch the installed Google Chrome so the version of the cached Chromium does not
matter:

```js
const { chromium } = require("playwright");
const browser = await chromium.launch({ channel: "chrome", headless: true });
```

## Getting a trip

Every dev run writes to the one shared Neon database, so open a fresh trip rather than
touching one that exists. Front door at `/`:

1. `#cityPlaceId` is a Google backed search over cities anywhere; fill it, wait for
   `[role="listbox"][aria-label="First city"] [role="option"]` and click one.
   Focused while empty, it offers eight cities from around the world instead, as
   `[role="listbox"][aria-label="Suggested cities"]` under a "Suggested cities"
   heading, asked once per page from `/api/places/cities/world` as the pointer comes
   onto the field or the panel opens; picking one fills the field and the hidden
   `cityPlaceId` as a searched city does. The panel shows five cities and part of
   a sixth (less on a short window); the rest scroll inside its `.scroll-line`
   box, under a heading that stays put, and the arrow keys scroll the row they
   pick out into sight. A row is picked out by the pointer moving over it, not
   by it arriving, so scrolling under a still pointer does not steal the keys'.
2. Dates are prefilled. Click `button[type="submit"]`.

It lands on `/t/<slug>/edit/<key>`. The key in the URL is the whole of the edit
authority, there is no cookie. `/t/<slug>` on its own is the read only share view and
has no search field.

Every trip opened this way is a row in the shared database. Delete them when done with
`db.trip.deleteMany({ where: { slug: { in: [...] } } })`, which cascades.

The page is drawn to `storage/plan2go First Page v5.dc.html`: two panels the height of
the window, the form in the middle of the right one, in `neutral-200`, the lockup in its
top right corner level with the headline, and in the left the headline, a day in Sydney
drawn for the eye (`aria-hidden`) and the AI box at its foot. The headline is one line on
a desk from about 1260px wide, sized to its column (36 to 54px), and two lines under
that. Under 860px it is one column, the lockup at the right over the words, the form in
its panel, then the AI box, as the v3 Mobile canvas had it, and no Sydney day. On a desk
600px tall or more the page is the window's height and never scrolls: from 980px tall
down to 700 the room, lockup and form spacing come down (`first-page.css`), and the Sydney
card takes the height left and is scaled to fit, gone under 0.6 of its 280px, or at its own
size stands in the middle of that height, as much room above it as below. Check a size by
`document.documentElement.scrollHeight` against the window's, with the calendar open as
well: it always opens under the dates and ends at least 16px over the window's foot, its
weeks drawn from 36px down to 28 to fit (`calendar-fit.ts`, the panel's `--week`), and
under that cut to the room (`--calendar-room`) with its weeks scrolling inside it. Launch
Chrome with `ignoreDefaultArgs: ["--hide-scrollbars"]` to see the scrollbar a page that
overflows is given, and what it moves. "Made with ♥ by
viciousbuilders", the heart and the linked name in `terracotta-700`, sits in the bottom
right corner, over the form's panel on a desk and last on a phone. The
form's "Start planning" is disabled until a city is chosen, with a line under it saying
what comes next, and the "Dates" row over the dates field has a `role="status"` pill,
"5 days" as the form opens. Beside the form on a desk, under it below 860px, is the
"Or build it with AI" box, an `h2` of that name: its "Copy the sentence" button copies
"Add the plan2go MCP server to your settings using this link: <address>. Tell me when
it's connected.", and its "Set it up manually" button opens a native modal `dialog` of
that name. In it, a `nav` named "Your AI app" holds `aria-pressed` buttons in two
groups, Chat apps (Claude, ChatGPT, Other apps) and Code tools (Claude Code, Codex,
Cursor, VS Code); name Claude with `exact: true`, since "Claude" also matches "Claude
Code". Every app's steps are drawn in one grid cell, the ones not chosen `invisible`
and `inert`, under an `h3`, "Connect plan2go to <app>", so the dialog keeps one height,
1120 by 609 at 1280 by 900. Each code box has a round Copy button named for what it
copies ("Copy the address", "Copy the Claude Code command", "Copy the Codex command",
"Copy the Cursor settings", "Copy the command"), and Cursor and VS Code have links
named "Add to Cursor" and "Add to VS Code", whose `cursor://` and `vscode:` hrefs carry
the address in their settings. Choosing an app writes `?client=<id>` into the address,
and a page opened with one opens the steps on that app. Escape, Close or a press on the
dimmed page closes it, and the page behind does not scroll while it is up. Under 640px
it is a sheet up from the foot of the window, the apps one row that scrolls sideways.
Grant `clipboard-read` and `clipboard-write` to read back what was copied. The address
is the browser's own origin plus `/api/mcp`, so a dev run shows
`http://localhost:3000/api/mcp`. The built HTML carries the live site's address
instead: load the page with `javaScriptEnabled: false` to see how that one wraps. The
headline and the dialog's heading are Caprasimo, loaded by `headline-font.ts` for this
page alone. Wait for `load`, not `networkidle`: the dev server keeps a connection open,
so the network never goes quiet.

## The search field

The bar is `.place-search .search-bar`; its field is `input[aria-keyshortcuts="/"]`,
which has no placeholder attribute (the empty field's words are an overlay,
`.search-words`). The bar carries `data-active` while it is in use, and
`.search-scrim` covers the page then. Both panels are `.search-panel` inside
`.search-bar`, mounted only while open, with no transition, so wait for them to exist;
a row is `.search-row`, with `data-active` on the one picked out. The place panel sits
in `.search-under` under the quick search row, and is mounted only while it has a
list, a sentence or an error to show, so the chips can be there without it. The place
list is the element the field's `aria-controls` names, a `[role="listbox"]` labelled
"Popular in <city>" or "Places that match"; the city panel is
`[role="dialog"][aria-label^="The city"]`, opened by `.search-pill`, with its own
field inside it, and hangs straight under the bar. Before anything is typed a sideways
row of quick search chips, one per kind of place, stands between the bar and the place
panel, outside the panel, as `.search-under .search-kinds`, and it goes once two
letters are typed; take one with `getByRole("button", { name: "Park", exact: true })`,
since rows named for a park match a looser selector. A chip is a toggle
(`aria-pressed`): pressed, the list's `aria-label` becomes "Parks in <city>" once
`/api/places/nearby?kind=park` answers, and pressed again it is "Popular in <city>".
Round arrows labelled "Scroll back through the quick searches" and "Scroll on through
the quick searches" are there only while there is more of the row that way. A
`MutationObserver` on `.place-search`, installed before the click, gives a
timestamped transcript of everything the panels say, which is the evidence for
anything about loading states.

Routes worth intercepting with `page.route`: `**/api/places/nearby**` (the city's
best known, asked once per city, and with `kind=` the best known of a kind, asked once
per kind and city), `**/api/places/search**` (typed search, 150 ms debounce, two
letter minimum, each answer kept so words typed again are not asked again) and `**/api/places/preview**` (the look at a
chosen place, which needs the edit key). Delay `nearby` to hold its waiting line still
for a screenshot.

## Adding a place

Choosing from the search list does not add. It looks the place up (`/api/places/preview`),
pins it on the map as `.trip-map-candidate`, pans there, and opens the sheet
`section[role="dialog"][aria-label="<place name>"]` with `button:has-text("Add to Day N")`
at the top. Pressing that adds the stop and the sheet slides away. Every row ends in a
plus, `button[aria-label="Add <name> to Day N"]` titled `Add to Day N`, which adds
straight away without the look. Once the place is on the day it is a disabled tick,
labelled `<name> is on Day N` and titled `On Day N`. An empty day offers
`button:has-text("Find a place")`, which focuses the search field; a reader without the
edit key gets no such button.

## Gotchas

- After Escape the field keeps focus, so clicking it again fires no focus event and the
  panel does not reopen. Blur first (click the map) before refocusing in a script.
- Choosing a place closes the panel and opens the sheet; the field is cleared. Refocus
  it to see the list again.

## Legs and drag

- Playwright's `dragTo` does not fire the HTML5 drop here. Dispatch `dragstart` on the
  card, `dragover` and `drop` on the target, `dragend` on the card, all with one
  `DataTransfer` handle from `page.evaluateHandle(() => new DataTransfer())`.
- A drop reorders on screen at once (`useOptimistic`) and shows "Working out the new
  times." with `aria-busy` until the server answers; wait for that line to go before
  reading times.
- `button:has-text("Change")` index 0 is not a leg. Legs start at index 1.
- Every leg with a route has a "Live times in Google Maps" link under the row, in the
  mode the leg uses. Rides are no longer listed on screen; they still go to the PDF
  behind the "Distance of each leg" switch.

## The pane's width

- On a desktop the list pane can be resized from `button[title="Drag to resize"]`, the
  grip astride its left edge. Drag it, press ArrowLeft/ArrowRight with it focused, or
  double click it to go back to the laid out width. The width is `--pane` on `main`
  and is kept in `localStorage` under `plan2go.pane` (a reset removes it); the pane
  never goes under 400px and the map keeps 480px.

## The dates field

- The pill is `button[aria-haspopup="dialog"]`; its calendar is
  `[role="dialog"][aria-label="Choose the dates"]`. Name the dialog: in dev the Next
  error overlay for the map key is a dialog too, and a bare `[role="dialog"]` hits both.
- Days are `button[data-date="YYYY-MM-DD"]`. The heading `p[aria-live]` reads "Choose
  the first day" or "Now choose the last day". The first click sets the start and the
  field's Last day follows the pointer; the second click commits.
- In the trip header the Save dates footer only appears once the range differs from
  the saved one, and saving leaves the panel open.
- Under 640px wide, or under 480px tall as a phone held sideways is, the front door's
  calendar is a sheet fixed to the foot of the window, at most 480px wide, one month
  at a time, put at the root of the document rather than in the form, over the page
  dimmed. Too short for its month it scrolls inside itself, the line with the steps
  held at its top. Pressing the dimmed page or Escape puts it away. Same dialog name
  and day buttons; step months with `button[aria-label^="Go to"]`.

## A place, opened

- `button[title="Place details"]` on a card, or `.trip-map-stop` on the map, opens
  `section[role="dialog"][aria-label="<place name>"]`. It reads "Looking up X." until
  `/api/places/card` answers; pictures come from `/api/places/photo`.
- A second dev server cannot start while one is running for this project. Drive the
  running one, or `pnpm build && npx next start -p <port>` for a production copy.
- After `pnpm db:push` a dev server started earlier still holds the old Prisma client
  and answers 502 on anything using a new table. Restart it.
