---
name: plan2go
description: Warm cream paper, over-rounded shapes, a terracotta accent with sage as a second voice, and the times louder than anything else on the page.
omitted:
  - spacing
colors:
  paper: "#F5EAD8"
  paper-raised: "#F9F4ED"
  paper-sunken: "#EBDDC5"
  ink: "#201E1D"
  ink-muted: "ink at 68 percent"
  ink-faint: "ink at 55 percent"
  rule: "ink at 13 percent"
  rule-strong: "ink at 28 percent"
  terracotta: "#C67139"
  terracotta-ramp:
    100: "#FFF2EB"
    200: "#FFE1D0"
    300: "#FFC6A5"
    400: "#F6A06B"
    600: "#B2622D"
    700: "#8C491A"
    800: "#643312"
    900: "#402310"
  sage: "#7A8A5E"
  sage-ramp:
    100: "#F0FAE1"
    200: "#E1EECC"
    400: "#AEBF92"
    600: "#728157"
    700: "#56633F"
    800: "#3D472B"
    900: "#272E1B"
  neutral-ramp:
    200: "#EEE7DB"
    300: "#DCD3C4"
    400: "#C0B6A5"
    500: "#A19786"
    600: "#82796A"
    700: "#645C50"
    900: "#2E2B25"
  city:
    1: "#C67139"
    2: "#6F7F53"
    3: "#D9A441"
    4: "#8C491A"
    5: "#4D5936"
    6: "#B5654A"
typography:
  headline:
    fontFamily: Baloo 2
    fontSize: 32px
    lineHeight: 1.25
    fontWeight: 600
  title:
    fontFamily: Baloo 2
    fontSize: 23px
    lineHeight: 1.25
    fontWeight: 600
  lead:
    fontFamily: Baloo 2
    fontSize: 20px
    lineHeight: 1.25
    fontWeight: 600
  anchor:
    fontFamily: Baloo 2
    fontSize: 18px
    lineHeight: 1.25
    fontWeight: 600
  place:
    fontFamily: Baloo 2
    fontSize: 16px
    lineHeight: 1.25
    fontWeight: 600
  time:
    fontFamily: Baloo 2
    fontSize: 14.5px
    lineHeight: 1.1
    fontWeight: 600
    fontVariantNumeric: tabular-nums
  body:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    lineHeight: 1.5
    fontWeight: 400
  small:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    lineHeight: 1.4
    fontWeight: 400
  meta:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    lineHeight: 1.45
    fontWeight: 400
  micro:
    fontFamily: Be Vietnam Pro
    fontSize: 11.5px
    lineHeight: 1.4
    fontWeight: 400
  label:
    fontFamily: Be Vietnam Pro
    fontSize: 10.5px
    lineHeight: 1
    fontWeight: 600
rounded:
  chip: 14px
  row: 18px
  panel: 20px
  card: 22px
  pill: 999px
shadows:
  sm: "0 1px 3px neutral-900 at 16 percent"
  md: "0 3px 10px neutral-900 at 16 percent"
  lg: "0 12px 32px neutral-900 at 22 percent"
components:
  stop-card:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  stop-number:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  leg-row:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    rounded: "{rounded.row}"
  day-tab-active:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
  day-tab-inactive:
    backgroundColor: transparent
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
  conflict-block:
    backgroundColor: "{colors.terracotta-ramp.200}"
    textColor: "{colors.terracotta-ramp.900}"
    rounded: "{rounded.chip}"
  stop-marker:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  endpoint-marker:
    backgroundColor: "{colors.sage-ramp.600}"
    textColor: "{colors.paper}"
    rounded: "11px 11px 11px 3.5px"
  map-control:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
---

# plan2go design

## Overview

Warm cream paper, over-rounded shapes, a terracotta accent with sage as a second
voice, and the times louder than anything else on the page.

This file is the source of truth for `src/app/t/`, `src/features/`, and `src/ui/`. It
overrides the `design-taste-frontend` skill inside the app shell.

The token values above are mirrored in the `@theme` block of `src/app/globals.css`.
When one changes the other changes in the same commit.

## Colors

The map keeps no hues of its own. Driving is `terracotta-700`, walking `terracotta-600`,
and public transport `sage-700`: two steps of the accent and the second voice, all three
already in the ramps above.

It kept three of its own for a while, spread as far apart on the wheel as three colours
could be, on the argument that a route in the product's own colour reads as the route
the product is recommending. That argument does not survive the drawing. What a route is
is settled by its pattern and by the key beside it, and a map whose ground, markers and
lines all come from one family reads as one thing rather than as a chart laid over a
map. Driving and walking are deliberately close, because the pattern is what separates
them and a line of separated marks says "on foot" without being read; transport is the
one line that is not a shade of the accent, and is therefore the one told apart at a
glance. There was a fourth mode once, cycling, with a cobalt of its own; it went when
the mode did.

There are two accents and they are not interchangeable. Terracotta is the product: the
stop numbers, the active day, the primary action, the route lines, and anything the plan
wants to tell you about itself, which in this product means a conflict. Sage is the
second voice and it carries the ends of a day and today in the strip. Everything else is
paper and ink.

- **paper:** the page, the day's card on the planner, a leg, and an end of the day
  still to be chosen.
- **paper-raised:** stop cards, the trip's row, floating controls, inputs, the search
  panel, menus.
- **paper-sunken:** the planner's ground, wells, the map gutter, a hovered control.
- **sheet:** what a printed sheet is drawn on, a step lighter than paper-raised, so a
  page of it is warm without being a page of ink.
- **rule:** hairlines and card borders, drawn as ink at low opacity so one value works
  over all three surfaces.
- **rule-strong:** the border of a control under the pointer, and dashed outlines.
- **ink, ink-muted, ink-faint:** primary text, secondary text, and placeholders.
- **terracotta:** the accent. 100 and 200 are tinted fills, 200 being the conflict block
  and the error block, the base is the accent itself, 300 is the edge of an export choice
  that is on, 600 is hover, 700 is pressed and is the step to use for accent coloured
  text, 800 is a chosen chip or menu row and the words on the city pill in the search.
  In a phone's day 100 is the block a stop's times stand on, the bold time in 800 and
  the words beside it in 700, and the card offering the next place, inside a dashed
  edge of 400, its block of times in 200 so it shows on the 100 around it. 200 is also
  the card a day with nothing planned says so on, its heading in 900, its sentence in
  800 and its way to the first place on 700.
- **sage:** the second accent. 100 and 200 mark today in the day strip, 600 is the marker
  for the ends of a day, 700 draws the public transport route line. 100 is also what an
  end of the day stands on: its row in a desk's day, inside an edge of 200 and going to
  200 under the pointer, its card in a phone's row of places on the map, and its card on
  the sheets. In a phone's day an end is a pill of 200, its time in 800 and its name in
  900, and an end not there yet a pill dashed in 400 with its disc in 200.
  A leg is never on sage, so an end never reads as one more leg. On a phone 200 is also
  the disc behind a way's glyph in the sheet that changes a leg.
- **neutral:** the warm greys behind everything, used for the drive tint and the map's
  own geometry. On paper, 100 is the ground of the map and of an end of the trip not yet
  set, and 800 the words on the pill that counts the stops. In the export's column, 500
  is the words of a choice that is off and the .pdf after the file's name. In a phone's
  day 200 is the disc a leg's glyph stands on, the glyph in 800, and 700 is the words of
  a leg and a stop's address.
- **city:** six colours, one for each city a trip goes to, handed out in the order the
  trip reaches them and round again for a seventh: terracotta, sage, ochre, deep clay,
  deep sage and rose clay. They mark which days share a city and nothing else. A city
  keeps its colour for as long as any day is in it, so a dot never changes under the
  reader because another day moved, and a city no day is in gives its colour back for
  the next new one. Which city holds which is kept on the trip.

Every ramp is generated in OKLCH on one shared lightness scale, so the same step of any
ramp carries the same visual weight. Only the steps the product spends are declared, so
the ramps above have gaps in them; the scale is the authority, not the list. A step that
is needed later is computed from that scale and added back, never chosen by eye to sit
between the two steps that happen to survive around it. Terracotta 400 and sage 400 came
back this way, both at the scale's 0.78 lightness on their own ramp's hue, for the
dashed edges of the offers in a phone's day.

Prefer a ramp step to an ad hoc `color-mix()`.

Never `#FFFFFF`, never `#000000`, on any surface, border, or text.

No dark theme. The ground is warm paper, and paper does not invert. Do not add a
`prefers-color-scheme: dark` block.

No status hues. There is no red, no amber, no green. A conflict is carried by the
terracotta block plus the sentence naming it, with the real numbers in the sentence.
The city colours are not statuses: ochre on a dot says which city, never that anything
is wrong.

Contrast floor: `ink` on `paper` is the body pairing. The accent to ground pair is
tuned to 3:1, which is enough for icons, large type and interface chrome and not enough
for paragraphs, so accent coloured text at body size uses `terracotta-700`.

## Typography

Two families, no more, and both of them carry Vietnamese. Paper is the one exception:
the printed sheets set their display face in Fraunces, which carries Vietnamese too, and
nothing else does (see Print). Baloo 2 for display, falling
back to Be Vietnam Pro, system-ui, sans-serif. Be Vietnam Pro for body, falling back to
system-ui, -apple-system, "Segoe UI", sans-serif. Both are loaded with the latin,
latin-ext and vietnamese subsets named explicitly.

That is a requirement and not a preference. This product is read in cities whose place
names it cannot spell without it: a face carrying latin only drops out of the typeface
part way through "Nhà hát Lớn Hà Nội" and hands the rest to whatever the system has, and
the stacked marks Vietnamese depends on, a tone over a circumflex in ế or ộ, come back
undersized and out of position. A face considered for this product is checked for
vietnamese before it is checked for anything else.

Baloo 2 is variable from 400 to 800, where the display face before it had one weight
that was already heavy. Headings ask for 600, which is what 400 used to give. They still
never ask the browser to synthesise a weight the face does not have.

Nothing in the display face is set under 1.25 line height where a place name can reach
it. Two marks stacked above a letter need the room, and a line box tight enough for
English clips the upper one.

Display carries times, place names, durations and the day heading. Body carries
everything else.

Eleven steps and no others, the anchor the last added, for an end's name on a phone,
which at the place step read as too small beside the stops' names and at the lead step
as one of them. Every size in the planner is one of them, set with its own
line height and, where it is a pill, with `text-step/none` rather than a second leading
utility fighting the first. There is one exception, and it is only ever a field's: below
1024px every field, and what stands in a field such as the search's empty words and the
.pdf after a file's name, is 16px, because iOS zooms the whole page into any field set
smaller as it takes the cursor and leaves it zoomed. Lead is the heading of what opens over the page: the place
open in the sheet, and the question asked before a trip is deleted; and on a phone, a
stop's name on its card in the day.
Small is the tier the interface is mostly made of,
tab labels, menu rows, the words on a leg, which used to be a scatter of 13px and 13.5px
chosen one component at a time. A number that is not on the scale is a number that has
not been thought about, and the marketing page, which the scale does not govern, is the
one place such a number may appear. Every element that renders a time or a duration sets
`font-variant-numeric: tabular-nums` so numbers stack in a column.

- **headline:** the trip name, the one line about the whole trip, a step over every
  other heading.
- **title:** the heading of an empty day, the printed day, and a page that has nothing
  to show.
- **anchor:** an end of the day's name on a phone, a step under the stops' names in the
  column it shares with them, as an end is a step under the places the day is for.
- **place:** a place name, and the time against an anchor row; on a phone, when a stop is
  reached, on its card's block of times, and the offers on its pills.
- **time:** when a stop is arrived at and left, on its card.
- **body:** running text.
- **meta:** secondary text, addresses, the words in a leg row.
- **micro:** the second line of a search result, and the sentence in a conflict.
- **label:** the small heading above a value. Sentence case, 600, never uppercase. The one
  uppercase heading in the product is the day's number on a day tab, which is set at the
  micro step rather than this one, over the date the way a calendar heads a column.

There was an eleventh, tick, at 9.5px, for the date and the stop count under a day
tab's name. It went when the tab became the day's number over its date, which is set at
the micro and small steps, and nothing else ever spent it.

Body text is left aligned. Never centred, except a single line inside an empty state.

## Layout

**Desktop, 1024px and up.** Two panes, map left and list right.

```
grid-template-columns: minmax(0, 1fr) clamp(520px, 40%, 660px);
```

The map fills its pane edge to edge, with no frame of its own. The list pane is a
column the height of the viewport: the trip name and the day tabs are fixed at the top,
and only the day itself scrolls, so what is being read is always named above it.

The list pane stands on sunken paper, and everything on it is laid on that ground 14px
in from the edge, 12px apart. The trip comes first, on a pill of raised paper under a
floating control's shadow: its name at the title step, its dates, and its menu, one row
about the whole trip. For someone who may edit, the dates are titled "Change the trip's
dates" under the pointer and the menu "Trip actions", neither while what it opens is
open. Under it the days, on one pill of paper 60px tall with 30px ends,
the way a phone app's tab bar is drawn: the strip of tabs and nothing else, held close:
seven in from every edge, so the pill reads as one control made of days. Each tab is a
pill 44px tall, the height a finger needs, eight in from the strip's edge so the two
curves run alongside each other, with two lines centred in it, **DAY 1** over **Sat 26**: the number uppercase at the
micro step, the date at the small step, both 600, four apart. Every tab is as wide as
the widest date needs, 82px, so the row reads as days rather than words, and they stand
four apart. The chosen day stands on a pill of raised paper edged in `rule` under a
floating control's shadow, the way the trip's own row above it is drawn, one for the
whole strip that slides along under the days to whichever is chosen. Being chosen
changes only what the day stands on: its words and its dot are the ones every day
has, `ink-muted`, and today in sage as before, on the pill or off it.
In front of the number, four off, a 7px dot in the colour of the day's city, so days
with the same dot are in the same city; the pill in the search is the key to them, and
the strip names no city. A dot is only ever drawn on paper, so it is always in its own
colour. A day with no city has no dot and keeps no gap for one. The city's name is the tab's title and is read out with its date.
Under the pointer a day that is not chosen takes `paper-sunken`, the step every control
on paper takes, with its words in `ink`, and today goes from sage 100 to 200. After the
last tab, eight off, the button that adds a day: a 32px dashed ring in `rule-strong`
with a 15px plus in `ink-muted`, still shorter than the tabs so it reads as an offer.
Under the pointer its dash takes the whole accent, its plus `terracotta-700`, over the
same `paper-sunken`. The focus ring is drawn outside every tab and the button, as it is
everywhere, and the strip keeps four pixels round them so no ring is clipped. While a
stop is carried, by the pointer or by a finger on its grip, every day but the open one
is offered as somewhere to let it go: a dashed edge 1.5px wide in `rule-strong`, drawn
2px out as the focus ring is, so the strip's room for a ring holds it. The day the stop
is over takes the accent's dashed edge at 2px over `paper-sunken`, as a card does under
a drop. Letting go there puts the stop last on that day. The open day stays open: the
stop leaves it at once, and the day fades under "Working out the new times." until both
days have their new times, as after a reorder. When the day leaves
is set on the day itself. Then the day itself: stops on raised cards, legs between them as one line hung on the thread, and the ends of the
day on shorter rows of sage 100 inside an edge of sage 200, the colour the sheets give an
end, so an end never reads as one more leg, going to sage 200 under the pointer; on paper
and dashed where an end is not there yet.
The day's thread runs on to a dashed row from the stop card next to it, across 26px
rather than twelve, as it runs down a leg to an end that is there.
A day with no stops says so beside the line its stops will hang on, with no card under
it, since a card on the day is a stop. The line is 2px of `terracotta` at 55 percent in
4px dashes 2px apart, down the middle of the ends' marks, and stops 18px short of the
rows above and below; the words are set left on the stops' left edge, the heading at the
title step, with **Find a place** under them. Twelve under the start of the day when
there is one, and twelve over the end when no leg comes between. The next place is offered as the next number, drawn dashed under the disc at the foot of
the last stop card, where a place found in the search is added. Three surfaces, each a step up from the one it sits on, and
nothing drawn edge to edge.

**Mobile, below 1024px.** Design 1b of "PlanToGo iPhone", the timeline: one view at a
time, and a bar of views floating at the foot of the window to go between them. Drawn
to the design file in everything but its faces and its sizes: the layout, the colours,
the edges and the shadows are the file's, and every word is in this product's two
families at the step of the scale nearest the file's own.

The bar of views is a pill of `ink` under `shadow-lg`, centred 20px clear of the foot of
the window, holding three pills a finger's height, each a glyph and its word at the
small step in bold: **Plan**, **Map** and **Export**. The view on show stands on a pill
of `paper` with its words in `ink`; the others are `paper` at 75 percent on the ink.
Each changes what the window shows, and Export is out of reach on a trip with nothing to
export. Nothing else floats over the page: the word that says a change is saved stands
centred 12px over the bar.

Plan is the page itself, on `paper`, and scrolls as a document. Nothing on it is stuck
to the top of the window. It keeps 20px at either side, is no wider than 640px on a
tablet held upright, and keeps 120px at its foot so its last line clears the bar.

At its head the trip's name at the headline step, in plain words for someone who may
edit as for a reader, and under it its dates as the desk writes them and how many days
they come to, "· 5 days", at the small step in `ink-muted`. Nothing on the row sets
either. At the right of the name, for someone who may edit, the trip's menu, a round
button 44px across on `paper-raised` inside a 1.5px hairline. A reader has none, and
exports from the bar.

The menu comes up from the foot of the window as a sheet, drawn as a leg's sheet is:
over the page dimmed with `ink` at 35 percent, raised paper rounded 30px at the top
under `shadow-lg`, with a handle, and under the handle, with nothing heading them, a
card for each thing that can be done to the
trip, 8px apart: on `sheet` inside a 2px `rule` edge, rounded at the `panel` radius, its
glyph on a 38px disc of sage 200, and its name in bold at the body step over what it
does at the meta step in `ink-muted`. **Edit trip**, "Name, start date and duration";
**Share trip**, "View-only and edit links"; **New trip**, "Start planning another
trip"; and **Delete trip**, "Remove this trip and all its days", its disc in terracotta
200 and its name in `terracotta-800`. Export is not one of them, since it is a view in
the bar. Edit trip and Share trip turn the sheet into their page, under the page's name
and an arrow back to the cards: "Plan your trip" and "Share this trip". Share this trip,
on a phone's sheet as in a desk's menu, gives each link a sunken pill, the read only
one first, the link in `ink-muted` and at the pill's end a 32px round button that
copies it, drawn as the starter page's copy boxes draw theirs: a pair of sheets in
`terracotta-700` on `terracotta-100` under the pointer, and a tick in sage 800 for two
seconds once it has copied, titled "Copy" and "Copied". Delete trip
asks its question over the sheet, as it does on a desk. Escape or a press on the dimmed
page puts the sheet away, and Escape on a page goes back to the cards.

Edit trip's page is drawn as design 1b draws the start of a trip less its main city.
"Trip name" in bold at the small
step over the name's field, 50px tall on `paper-raised` inside a 1.5px `rule` edge, at
16px. Then "Dates" in bold at the small step, and on the same row the month, "October
2026", in bold at the body step between the two arrows that step it, each 40px across.
Under that row, centred and on the page rather than on the month's card, the line a
desk's calendar has over its months, saying which press comes next, "Choose the first
day" or, once it is pressed, "Now choose the last day", at the body step in 500
`ink-muted`. Under it the month on `paper-raised` inside a 1.5px `rule` edge, the name's
field's, since the sheet under it is `paper-raised` too, rounded at the `card` radius, a
week to a row, Monday first: the weekdays at the micro step in 600 `ink-faint`, and every day in
bold at the body step on a disc 40px across in a cell 42px tall. The trip's two ends
are filled in `terracotta-800` with their day in `paper`, and the days from one to the
other stand on a band of `terracotta-100`, rounded off where it stops. The first press
on a day begins the trip there and the second ends it; a press before the first day,
or once both are set, begins again. Under the month, what has been drawn at the body
step in 600 `ink-muted`, the dates and how many days they come to, or "Now pick your
last day", over **Save trip** on the accent's solid pill across the sheet. Nothing is
written until Save trip is pressed, and it is not offered until both ends are drawn.
Dates that come to fewer days than the trip has are said for what they cost before it
is pressed, in a notice over it: "Saving takes Days 5 to 7 off the trip, and the 9 stops
on them". A day is kept by its place in the trip rather than its date, so a shorter
trip loses its last days. A desk's calendar says the same over its Save dates.
Saving puts the sheet away; going back to the cards, or putting the sheet away, leaves
the trip as it was. The dates keep to the same rules as a desk's calendar: any day may
be chosen first, and a trip runs to 365 days at most, so while the last day is being
chosen the days past that are in `ink-faint` and not offered.

Under them the strip of days runs out to the window's edges, scrolling the days under
them, 20px in at either end, so the first day stands under the trip's name. A day is a
card at least 80px wide, 6px from the next and all as tall as the tallest, on
`paper-raised` inside a 1.5px `rule` edge, rounded at the `panel` radius, its words
centred in it: "DAY 1" at the micro step in 600 capitals, its date, "Sat 10", at the
body step in bold, and its city at the micro step, the number and the city a little
faded. No dot leads the number, neither the city's nor one for whether anything is
planned on the day. The chosen day's card is filled in `terracotta-800` with its words
in `paper`, the way a chosen chip is
anywhere in the product; today, when it is not chosen, is in sage 100 inside a sage 200
edge with its words in sage 800. After the last day, centred on the
cards and as far from them as they are from each other, the button that adds a day, a
44px dashed ring.

Then the day, 16px under the cards, with nothing between them to say what the day comes
to, as the phone's day design draws it: one column the window's width, with no column
of times and no numbers on the stops. A dotted thread runs down its left behind
everything, its middle 24px in, from the first thing's middle to the last's. Every card
and pill on it is opaque, so the thread shows only in the room between them and through
the legs, whose discs stand on it as an offered end's disc does. Two things that are not legs
stand 12px apart; a leg brings its own room above and below.

Its type is one system, each role set one way wherever it stands. The display face, in
600, is for places' names only, a stop's at the lead step and an end's a step under it
at the anchor step, in the column they share; everything else is in the body face. Every time a place is
reached, left from or passed is bold at the place step, in the 800 of what it stands on,
with "to" and "from" before a second time in 600 at the meta step in that colour's 700.
An address and a note are at the small step in neutral 700; a leg's words are 600 at
the body step in the same; and every offer, **Add a place**, **Add start point**, **Add
end point**, is bold at the place step. The times stand in one column, 74px wide and
10px in on every line that has one, and the names start 14px after it, so times stand
under times and names under names, ends and stops alike.

- An end of the day: a pill of sage 200 with no glyph on it, 48px tall and rounded to
  half that, so a name long enough for two lines makes a card with the same round ends.
  At its left when the day passes it, in sage 800, centred in the column of times; then,
  where a stop's name starts, the place's name in sage 900, and under it its address
  at the small step in sage 800, 4px down, as a stop's address is under its name. What
  the day does there, "Leave", "Finish at", "Back at", is read out before the name
  rather than drawn. The whole pill is one button that opens the place, where the end
  is changed for another or taken off the day; under a pointer an edge of sage 600 at
  55 percent comes round it. The start's time is when the day leaves, which for someone
  who may edit is the control that sets it, in the same column: the time and a chevron
  after it with no edge round them, both in sage 800 as the end's time is, 4px in and
  3px apart in a transparent edge so the time stands where a read time does, lifting to
  sage 100 under a pointer and while its picker is open. The picker is in sage too, so
  it reads as the start's own: the chosen hour and minute in sage 800 with their digits
  in `paper`, as a chosen chip is in the accent's 800, and a row under the pointer in
  sage 100. On a stop's terracotta block, with no start, the same control is in
  terracotta 800 as the stops' times are, lifting to terracotta 200, and its picker
  keeps the accent's colours.
- Without an end, someone who may edit is offered one on the same pill drawn dashed in
  1.5px of sage 400 on `paper`: the end's disc in sage 200 with its glyph in
  sage 700, **Add start point** or **Add end point** in sage 800, and a 16px plus in sage
  600 at its right end. It goes to the search on the map,
  as **Add a place** does. Under a pointer the dash takes sage 600 and the paper lifts to
  `paper-raised`.
- A leg: a line rather than a box, 50px tall and one button, which brings up its sheet:
  the way's glyph in neutral 800 on a 26px disc of neutral 200 standing on the thread,
  then the way and how long it takes, "Drive 14 min", with a chevron. A leg that cannot be made says so in the same ink, with no glyph
  on its disc.
- A stop: a card of `paper-raised` at the `row` radius under `shadow-sm`, the column's
  width. At its left, on a block of terracotta 100 at the `chip` radius filling the
  column of times and as tall as the card less its padding, when it is reached in
  terracotta 800 over when it is left, "to 10:14", in terracotta 700; then its name over
  its address; a conflict under them in its block, and the traveller's note under that,
  behind its glyph, set as the address is. The whole card is one button, which opens the
  place, where how long is spent there is set and the stop is moved or taken off; under a
  pointer it sinks to `paper-sunken`. With no start, for someone who may edit, the first
  stop's arrival is the pill that sets when the day leaves, in the block in place of the
  time, the block keeping 2px either side of it.
- After the last stop, 16px under it, for someone who may edit, the next place, laid out
  as a stop's card is, so it reads as the slot the next stop would take: the card's
  shape and padding, terracotta 100 inside a 1.5px dashed edge of terracotta 400, flat
  where a stop's card is raised, the border outside the padding so the block and the
  words stand on the stops' own edges. At its left a stop's block of times, in
  terracotta 200 so it shows on the 100 around it, "from" in terracotta 700 over when the
  last stop is left in terracotta 800, which is when the way to the next place would
  begin, as the foot of a desk's last card says it; then, where a stop's name stands,
  **Add a place** in terracotta 700, and a 16px plus in the same at the card's right end. Under a
  pointer the dash takes the whole accent. An end not there yet stands 10px under it.

A day with nothing planned says so between its ends, on a card of terracotta 200 at the
`card` radius, 24px in on every side, standing 52px in, on the edge an end's offer starts
its words on, and running to the column's right edge: "Nothing planned yet" in the
display face at the title step in terracotta 900. For someone who may edit, under it,
"Add your first place. Travel times fill in as you go." at the body step in terracotta
800, and 16px under that the way to the first place, a 48px pill of terracotta 700 with
a 16px plus and **Add a place** in `sheet`, set as every offer's words are, deepening to
800 under a pointer. The day's thread is the same dotted line as between stops, not a
dashed line of its own, and runs down beside the card from one end of the day to the
other.

A leg pressed brings up a sheet from the foot of the window, over the page dimmed with
`ink` at 35 percent: raised paper rounded 30px at the top under `shadow-lg`, with a
handle, "Getting to Taronga Zoo Sydney" at the lead step over "From Sydney Opera House",
and a row for every way of covering the leg, its glyph on a 38px disc of sage 200, its
name in bold over how far it goes, and how long it takes in the display face at the lead
step at the row's end. The way in use is `terracotta-100` inside a 2px edge of the
accent, the rest `sheet` inside `rule`. Choosing one writes it, says the new times are
being worked out, and lets the sheet go when they are, since the day under the sheet
cannot be seen to change while it is up. The leg's live times in Google Maps, and the
sentence saying a time is a guess, are in the sheet. A reader gets the sheet too, with
the ways to compare and none to choose. Escape or a press on the dimmed page puts it
away.

A stop pressed opens its place, the whole window (see A place, opened), and on a phone a
stop is changed there rather than on the day: under the place's name, its hours, "Day 1
· arrive 09:13, leave 10:28"; the note; "Stay for" with a minus and a plus a quarter of
an hour at a time on a 44px disc of `neutral-200` either side of the stay, on a card of
`sheet`; two pills that move the stop one place earlier or later in the day; and
"Move to another day" in bold at the body step over the other days as pills of the
same kind, as wide as their words and in the words the map's chips use, "Day 2 · Sun 8",
running to the sheet's edges and scrolling sideways on a long trip, any of which takes
the stop to the end of that day. On a desk both are done by dragging its card, along
the day or onto a day in the strip. The sheet stays on the stop, which then says the day
it is on. The stepper writes once its presses stop, so an hour more is one write rather
than four. An end of the day pressed opens its place too, and is changed there. Under
its name, **Change start point** or **Change end point**, a pencil and the words on one
of the stop's outlined pills, as wide as the sheet and 40px tall, goes to the search on
the map to find that end, and the place chosen there takes this one's place without it
being taken off first. Under that, **Remove start point** or **Remove end point** takes
it off, where a stop's sheet has **Remove from Day 1**. A desk's sheet has neither for
an end, whose row changes it and takes it off.

The search is on the map, as design 1b of "PlanToGo iPhone app" draws it, and **Add a
place** goes there with the cursor in the field and the keyboard up, as **Add start
point** and **Add end point** do to find an end. A phone has no search of an end's own:
sent from a card offering one, the search finds that end rather than the next stop. It
says so after the heading, in place of the day it adds to, "Popular in Sydney · where
Day 1 starts"; a row's plus is titled "Start Day 1 here" and read out "Start Day 1 at
The Old Clare Hotel", and makes the place that end, after which the field empties and
the search is put away, since a day has one of each; and the sheet of a place chosen
from it offers **Start Day 1 here** rather than **Add to Day 1**. A place already on
the trip is offered all the same, with a plus rather than a tick, since the hotel one
day ends at is the one the next starts from. Put away with nothing chosen, by its cross
or a press outside it, or left for **Add a place**, another day or another view, the
search goes back to finding the next stop. Setting an end is said to a screen reader,
"Day 1 now starts at The Old Clare Hotel".

Map is the map over the whole window, with nothing of Google's drawn on it and none of
ours but its rows. At the top, for someone who may edit, the search bar, the desk's own:
the city pill, without the dot that on a desk is the key to the days' dots, since a
phone's days carry none, the field and its turning words, 12px down and 14px in at
either side, keeping the lift it has over a desk's map since here too it floats over
one. Under it, 8px clear, the quick searches stand on the map whether or not the search
is in use. A press on the field, or on a quick search, opens the search, and it opens as
on a desk: the list hangs under the quick searches over the map, the bar's width, headed
"Popular in Sydney · adding to Day 1", since it opens over the days rather than beside
them. It stands over everything on the map, the day's rows at the foot included, which
stay where they are under it and still scroll sideways under a finger while it is open,
which leaves it open. Nothing is dimmed. A press anywhere outside the search, the map
or the rows at its foot, closes the search and does nothing else, and the cross
at the bar's end, there for as long as the search is open or anything is typed, closes
it and empties the field. A row is a finger's, with a desk's own marks: the bare pin in
the accent at its front, the name at the body step over the address at the meta step,
and the bare plus at its end, sage's tick once the place is on the day, answering a
finger over 36px though drawn no larger than a desk's. Choosing a row opens the place, as
anywhere, and adding it leaves the list open for the next. The keyboard's own key says
"search" and opens the row picked out, as Enter does.

Along the foot, 12px over the bar of views, the day's rows. First a chip for every day,
"Day 1 · Sat 10", a pill at the small step in bold on `paper-raised` under `shadow-sm`,
the open day filled in `terracotta-800`, so the map goes from day to day without the
list. Under the days, 8px clear, the day in order: a card for where it starts, one for
every stop and one for where it ends, the ends when the day has them, each 250px wide
rounded at the `card` radius under `shadow-md`, a stop's on `paper-raised` and an end's
on sage 100, as an end is in the day's own view. A stop's card has its
number on the disc the map marks it with, its name in the display face, and when it is
reached and left. An end's has the end's mark where the number is, the sage square with
one corner cut and its glyph, as large as the disc; the place's name; and what the day
does there with the time, the words the day's own view says, "Leave at 09:00", "Finish
at 17:40", or "Back at 17:40" where it ends where it started.
Two cards stand 60px apart, and the leg that joins them is drawn between them, card
edge to card edge, as the map draws it: its pattern in its own ink over a casing of
`paper`, as thin as a desk's key draws its samples, and at its middle the glyph its row
on Plan carries, 15px in the same ink, on a 28px bead of `paper-raised` ringed 2px in it
under `shadow-sm`. So the row is the key to the lines over it, a dotted line on the map
being the walk drawn with the same dots in the same colour down here, and the lines
themselves carry nothing. A day with no stop says "No stops on this day yet" between
its ends, never narrower than its words on one line, and draws no leg across them.
A card pressed picks its place out, its edge taking the accent for a stop and sage for
an end, the colour of the ring its marker takes, and its marker drawn large; pressed
again it opens the place. A marker pressed picks its card out the same way, an end's as
a stop's, rather than opening the place as it does on a desk. A leg's bead pressed picks
the leg out the same way: the bead fills with its ink, with the glyph in `paper`, inside a
5px ring of the ink at 22 percent, as a picked marker takes a ring, and the leg's line on
the map is drawn heavier inside its halo, as a leg under the pointer is on a desk. There
is nothing to open from it, so pressed again it lets the leg go. All the room between
the two cards, 60px by 44px, answers a finger. A press on the map, anywhere but a
marker, lets go of whatever is picked out, the card's edge and the marker or the line
going back to how they stand; held for the moment a second press could follow it, so
a double press zooms and lets nothing go, and a drag moves the map and lets nothing
go either. The day is framed in what
the rows leave of the window. One finger moves the map and two zoom it, and there is no
zoom pair and no route key under the map: the row of places is its key.

Everything on a phone is pressed with a finger: what is drawn smaller than 40px answers a
finger over the room around it and is drawn no larger, and nothing that answers a finger
reaches into what another answers. A field is 16px on a phone, whatever step it is set
at on a desk, because under that iOS zooms the whole page into a field as it takes the
cursor and leaves it zoomed (see Typography). Edit trip's page is in the menu's sheet,
which scrolls inside itself once it is taller than most of the window, as it is on a
small phone or one held on its side.

## Elevation and depth

Three steps, all tuned to the cream ground rather than to a white one.

```
--shadow-sm   a floating control: the search field, the zoom pair, a map marker
--shadow-md   a panel that opens over the page: the search results, the calendar, and a
              stop card while a finger carries it
--shadow-lg   a layer over the whole viewport: the export, and on a phone the bar of
              views at the foot of the window and the sheet a leg opens
```

Everything that is not floating separates with `rule` or with a change of surface
between `paper`, `paper-raised`, and `paper-sunken`.

## Shapes

Over-round, and never sharp. `chip` for tinted inline blocks, `row` for the leg row and
the anchor rows, `panel` for a panel that opens over the page, `card` for a stop card,
and `pill` for every button, input, tab, and marker.

Round shapes need air to read as soft, so nothing is crowded and nothing is drawn with
hairline only geometry.

## Components

Token values for each component are in the front matter. The rules the token schema
cannot express are here.

The day runs down a dotted thread on the left, drawn as a repeating gradient rather
than a dotted border, which rounds its dots off at this width. On a desk it runs down
the legs between the cards, and from a card to the dashed row offering an end of the
day that is not there yet, in the column the legs keep it in, three of its dots whole
and 2px clear of either, as a leg's are; and it stops at their edges: a stop card's
numbered terracotta disc stands on its own, with nothing drawn under it. On a phone it runs the length of the day behind
its cards and pills, 24px in, through the legs' discs and an offered end's, as Layout says. A leg hangs on the thread with no card of its own, because it is what happens
between two stops rather than a thing in itself.

The start and end of a day are a different shape from a stop, not merely a different
colour: a sage square with one corner cut, against the terracotta discs. A day may
start and end in the same place, in which case there is one marker rather than two on
top of each other. Each says when the place it stands at is open, in the same words and
the same clock a stop card uses: a hotel that locks its doors at eleven is as much use
to know about as a museum that shuts at five.

An end's row is laid on a stop card's grid to the pixel: the name and address on the
stops' left edge, in words rather than as a button, and at the top right the time, on
the stops' right edge so the day's times stand in one column, with the tools under it.
The tools are a card's, in sight rather than behind a menu: the glyph that opens the
place, which a reader gets too, and for someone who may edit a pencil that changes the
end and the cross that takes it off, each named for what it does and drawn at 55
percent until the pointer is over the row, or over the tools themselves, as a card's
are. Under the pointer, here or on the map, the row goes to sage 200 inside a ring of
sage 600 at 55 percent; not while the pointer is on one of its controls, the start's
time and the picker it opens, or a tool, which answers the pointer on its own while the
row stays as it was, as a card does. The end's marker on the map stays lit under all of
them.

A stop says when it is arrived at and when it is left, the pair at the top right with an
arrow between them. The second is the first plus the stay set underneath, which is
arithmetic a person should not have to do to find out when they are done somewhere.

A conflict is a terracotta block carrying the sentence that names it, with a warning
triangle beside the words. The accent rather than the second voice: sage is what the ends
of a day are drawn in, and a conflict wearing it shared a colour with the thing it was
often about. The triangle for the same reason the clock is gone, which is that a clock
said only that this concerned the time, and every line on a stop card does. The tint
alone is never the signal.

A stop card carries its own controls and, on the last card of the day, one other,
described below. The two that act on the whole
stop, opening its place and taking it off the day, sit under the two times at the top
right, because they are about the row rather than about anything inside it. They sit just
under the times however many lines the name and the address run to, in one column on
the right with the times, the column the ends of a day keep too; the name and the
address stand in their own column beside it, so a long name no longer pushes the tools
down away from the times. Under the pointer, here or on the map, the card sinks to
`paper-sunken` inside an edge of `terracotta` at 55 percent; not while the pointer is on
one of its controls, a tool, a pill, the note, the next place's slot or the picker a
pill opens, which answers the pointer on its own while the card stays as it was. The
stop's marker on the map stays lit under all of them but the slot, which is about the
stop after this one. The tools are drawn at 55 percent until the pointer is over the
card, or over the tools themselves, and never hidden, since half the people using this
have no pointer to hover with. How long the stop lasts is a pill with an hourglass on it,
titled "Time at this place" under the pointer, that opens two columns, hours and minutes, the same columns the day's leaving time
opens, and writes when it closes; the opening hours sit beside it in words after a
clock, and the note is either a field or the one line offering to start one. An
hourglass and not a second clock, because one glyph for both a length and a time of day
left "1 hr" to be read as either. Removing is immediate: a stop is a search away from
coming back, and a dialog asking twice would be a modal over something editable in
place.

A stop is moved by dragging its card, along the day or onto a day in the strip. With a
mouse the whole card is the handle: over it the pointer is the hand that grabs, closing
while the button is held, and over anything on it that can be pressed, the tools, the
pills, the note's offer and the next place's slot, it is the hand that points, as on
every button; in the note's field it is the text cursor. The card's tooltip says what
dragging it does, "Drag to reorder, or onto another day", over the card itself and
never over what can be pressed on it, which says nothing or its own name. A reader,
who cannot move a stop, gets the plain arrow and no tooltip. There is no grip under a
mouse, since the card itself is dragged.

A touch screen as wide as a desk has no drag of its own, so there a grip between the
two tools carries the card under a finger: the card goes where the finger takes it, on the shadow of
what floats, the card it is over is outlined as a drop is under a pointer, and letting go
puts it there, brought into sight if it landed past the edge of the list. Carried up
over the strip, it goes under it, and the day the finger is over is outlined as under
a pointer, and letting go takes the stop to that day. Held near the
top or the foot of what can be seen of the day, the day scrolls on under it. A press on
the grip that goes nowhere is only a press. A phone's cards have no grip: a stop is
moved from its place's sheet (see Layout).

When the day leaves is set where that time shows, on the day rather than above it: on
the start point's time when the day has one, and otherwise on the first stop's arrival,
which with nothing before it is the moment the day sets out. One of the two carries it,
never both, and it defaults to 09:00. For someone who may edit, that time is a button:
the time in the times' own face and step with the stay's 12px chevron after it, and no
edge round it, as on a phone. On the start of the day it is in the colour of the row it
stands on, sage 800, the chevron in the same, as a phone's start is; on the first stop of
a day with no start, in the card's times' `terracotta-700`, the chevron in the arrow's
`terracotta-700` at 65 percent, quieter than the time as the stay's chevron is quieter
than its words. Under the pointer, and while the picker is open, it stands on the
lightest tint of its colour: sage 100 on the start's row, which sinks to sage 200 under
the same pointer, so the time comes up lighter out of it, and `terracotta-100` on the
card, which sinks to `paper-sunken`. The picker is the same two columns the stay opens,
hanging from the button's right end, its chosen rows filled in the 800 of the same
colour with the digits in `paper`, sage under a start and the accent's under a first
stop, and the row under the pointer in its 100. The button takes
exactly the room the plain time takes: the time's own line height, with 1px of padding
and 1px of edge, drawn in nothing, above and below given back by a 2px margin, so the
time sits where a
reader's plain time does and nothing else on the card or the row moves. Across, the
whole times line is 7px apart as it is seen: the button's side to the time, the time to
the chevron, the chevron to the button's side, that to the arrow, and the arrow to the
next time.
The chevron and the arrow carry some margin inside their own boxes, so what is written
is 6px of padding on the left, 5px before the chevron as before the arrow, and 4px
after it. A reader
without the edit link gets the plain time in both places.

The last card on the day ends with the stop that would come next, as a slot in the
discs' column. Under the disc, with nothing drawn between them, is the number that stop
would get, in a 30px circle drawn 1px, dashed, in `terracotta` at 55 percent, the weight
a hovered card's edge is drawn at. The digit is
the disc's face and step, in `terracotta-700`. Beside it, on the left edge of the name
above, **Add a place** at the small step in `terracotta-700`, the stay's step, and at
the right, "from" and the time this stop is left, at the micro step in `ink-muted`, the
step the opening hours are in. That is when the way to the next place would begin, not
when the next place would start: the leg between them comes first. The slot is the
card's second row, 13px under its body, as far as the body is from the card's edge. The
whole row is one button that takes the traveller to the search field. It runs from the
ring's left edge to where the times end, and the time sits 10px in from that end, as
the stay's words do from its edge. Under the pointer the row is a pill as tall as the
ring in `neutral-200`, the fill the card's tools take under the pointer, and the ring's
dash takes the whole accent, as every dashed control's does; the words stay as they
are. With the keyboard on it the focus ring draws the same pill, with no fill, as on
every other control. The card behind it does not sink the way it does under the
pointer, and this stop's marker on the map is let go: the slot is about the stop after
this one. It is on the last card because that is where a place found in the search
goes, and it is the one control on a card about the day rather than the stop. A reader
without the edit link does not get it.

A leg opens. Closed it is one line hung on the thread, 58px from card to card, with no
pill of its own. On the thread, level with the words, the way's glyph on a 26px disc in
the leg's own ink, the ink its line on the map is drawn in: the glyph in it outright and
the disc a 16 percent wash of it over the panel's ground, so the disc is solid and the
thread passes behind it, as a bead on a string. Beside it, on the edge the legs' words
keep, the way's name at the body step in 600 with a chevron after it, which is the
button that opens the panel, a pill of `neutral-200` under the pointer, titled "Change
how you get there"; then how long it takes and how far, "48 min · 45 km", at the body
step in `ink-muted`; and on the times' right edge **Live times** at the body step in 600
`terracotta-700` with an arrow going up and out, the leg in Google Maps at the moment
the day sets out on it, in a new tab. A reader gets the name without the chevron. Under
the pointer, here or on the map, the disc takes a 2px ring of its ink, as the line on
the map is drawn heavier. A leg that cannot be made says so in place of the name and the
times, with **Change** after it for someone who may edit, and has no disc, since it has
no line on the map. Open it is a sunken panel of every way of covering the same ground, one
tile each, carrying the mode, the time and the distance, with the one in use outlined
in terracotta and its dot filled. Choosing leaves the panel open, because the outline
moving and the times below changing are the answer and trying a second mode should not
mean opening it again. Collapse is what closes it, as the way's name above it does. While the new times are being worked
out the tiles stay on screen at reduced opacity under a line of text saying what is
happening, which is what this product does instead of a skeleton.

## A place, opened

A stop, or an end of a day, can be opened to see what its place is like, from **About
this place** on its row or by pressing its marker on the map. What opens is a sheet over
the left edge of the map: a card 408px wide, standing 8px in from the map's edge and
8px short of the top and bottom of the window, rounded at the `panel` radius and edged
with `rule` under `shadow-md`, with the map still in sight beside it, and the whole
window on a phone. The map frames the day, or the place a search is looking at,
in what is left of it beside the sheet, so nothing it is showing is under the sheet.
The search field stays in the map's corner, floating over the top of the sheet: a 48px
pill, 16px in from the sheet's sides and 20px down from its top, so over the sheet it
sits in it the way a map search sits in the panel it opened, and over the map alone it
is the same field in the same place. Inside, the sheet keeps 24px at each side. While
the sheet is open the field holds the place's name, as a map search does: the place is
what was searched for, whether it was found in the field or opened from the day, and
the cross on the field is what closes the sheet, drops the pin and empties the field. It slides in from the left and slides back out the same way. On a desk the tab
on its free edge, halfway down, pointing the way it goes, puts it aside rather than
closing it: the map is seen whole, exactly as it was, and the pin, the name in the
field and the place stay; the tab waits at the window's edge, pointing back, and
brings the sheet back, as does opening anything. The map is framed for a sheet
opening or closing and never moved for one going aside or coming back. On a phone a round button
of raised paper in the top left corner, pointing back the way the sheet goes, closes it,
and so does Escape anywhere; there the picture is 300px tall, and a stop's own part of
the sheet stands under its name (see Layout). The picture comes first because it answers
fastest; then the name, the kind of place and its rating out of five with a filled
terracotta star; then the sentence the provider has for it, a strip of more pictures, the
address and the ways to reach it, and what people say, each with their stars and how
long ago. Any picture opens as large as the window allows, with the next and the last a
press or an arrow key away. Nothing in the sheet changes the trip. It is asked for when
opened and never before, because it is the dearest question the place provider answers,
and it is shown whole once its words and pictures are all here rather than as they
arrive. Every picture and rating in it is credited to where it came from.

A trip can move between cities, so every day is in one: its own once it has been moved,
and the city the trip was opened in until then.

The search on the map is drawn to the design file for it, "PlanToGo search bar", in
everything but size: the colours, edges, shadows and movement are the file's, and the
sizes are this product's, so the bar keeps its 48px and the width that sits it over
the place sheet, and every word stays on the type scale. What is in the two panels under
it is the exception, and keeps the product's own list, described below; the panels
themselves are the bar's. Its palette is its own and lives in `place-search.css` and
nowhere else: a surface a step warmer than `paper-raised`, which the bar, both panels,
the chips and the arrows share; a tint of the accent for the pill and anything held
down; a warmer tint still, `#f8ebdd`, for the row or arrow under the pointer; and the
ink and the accent mixed to the strengths the file gives them.

The bar: the surface inside a 1.5px edge of ink at 6 percent under a soft shadow, and
while it is in use, typed in or with either panel open, the edge takes the accent at 60
percent and a 5px glow of the accent at 12 percent rings the search's lift, `0 10px
30px` of ink at 16 percent. The edge is drawn inside the bar rather than as a border,
so it takes no room and the panels hang from the bar's own outer edge; the bar is
padded 6px, and the pill stands 6px in from its edge. In it, in order: the city pill; a 22px hairline; the glass, which takes
`terracotta-700` while the field has the cursor; the field, whose empty words say
"Search for a place" and turn the kind of place over every few seconds, through the
quick searches whose word also finds them when typed: cafés, museums, hotels. The
words leave the city to the pill beside them, which already says it, so they fit
whatever the city is called; the field is never narrower than its longest words,
"Search for a place", and on a narrow screen or in a city with a long name the pill
cuts its name short first. Then a spinner of the accent while a search or a look is
running, and the cross once anything is typed. "/" from anywhere that is not a field
brings the cursor to the search, with nothing in the bar to say so. While the bar is in
use the page under it is dimmed with ink at 6 percent, and a press on it, or Escape,
closes everything.

The city pill: the city's dot and name in bold on a tint of the accent, darker under the
pointer, pressing in a little when pressed. Open, it turns to the accent's deepest brown
with its words in warm paper, its dot takes the lighter tint of the city's colour and
its chevron turns over. Choosing a city pops the dot with a ring of its colour spreading
from it and slides the new name in, which is how the move is told: nothing else on the
page announces it, since the pill and the day already show it.

The panels, the places the field finds and the cities the pill offers, hold the
product's own list rather than the file's, drawn from one set of classes in
`place-search.css`, so the two cannot drift apart. The panels themselves are the bar's,
so the bar and what it opens read as one thing: each hangs from the bar, exactly its
width and 8px under it, or 8px under the quick searches where they stand between the
two, on the bar's surface inside an edge of ink at 10 percent at the `panel` radius, at
the same lift as the bar in use, there or not there with no movement, and no taller
than 330px, past which it scrolls.

The quick searches: before anything is typed, between the bar and the place panel and
outside the panel, standing on the map on their own, a chip for each kind of place:
Café, Street food, Museum, Temple, Market, Viewpoint, Park, Nightlife, Hotel, Shopping.
A press lists the best known places of that kind in the day's city under "Parks in
Hanoi", in place of the city's best known, and holds the chip down; pressing it again lets go and the city's best known come back. The kind is found by
what the places are, not by what they are called, which is why it is a chip and not a
word typed: typed, "Park" finds the Park Hyatt and car parks. While the kind is being
asked about the panel says "Looking for parks in Hanoi." They stand in one row that
scrolls sideways rather than wrapping, with no scrollbar, exactly the bar's width with
its first chip on the bar's edge, 8px under the bar and 8px over the panel.

The row is drawn to design 10c of "PlanToGo quick search options", in the search's own
palette in `place-search.css`, since it is the search's and not the list's. Each chip
is a pill of the bar's surface inside an edge of ink at 14 percent, on a small shadow of
ink at 10 percent, `0 2px 6px`, since it stands on the map and not on the panel, a 14px
icon of what it finds before its word at the meta step in 600 `ink`, a step under a
place's name so the chips weigh less than the list under them. Under the pointer its
edge takes the accent; pressed, it sinks to 95 percent over 0.12s and comes back as it is let go, as
the city pill does; held down, it takes the city pill's colours, its
tint with the pill's brown words, inside the accent's edge. Colours and edges change
over 0.15s. Where there is more of the row beyond an end the chips fade out towards
it, over 56px on the left and 80px on the right, and a 30px round arrow of the
surface inside an edge of ink at 12 percent, on the chips' shadow, stands 4px in from
that end, warming to the row tint under the pointer, and moves the row on by 240px. The
arrows never take the cursor from the field; a keyboard
goes from chip to chip instead, each scrolled into view as it takes the focus.

The place panel: under the chips, the city's best known places headed "Popular in
Hanoi", and once something is typed and the chips have gone, "Matching places", each
heading at the label step in `ink-muted`, and staying at the top of the panel while the
rows scroll under it, as "Cities nearby" does in the city panel. A row has a pin in the accent at its front, the name at the
small step in 600 over its address at the micro step, the same as a start or end of
the day in the planner beside the map, both wrapping rather than cut short, and at its
end a plus on a 26px round, taking the pill's tint under the pointer, that puts the
place on the day without the look, or a sage tick once the place is on the day. The row
under the pointer or the arrow keys takes the search's warm tint, and the row itself
opens the place. Nothing matching says "Nothing matched. Try the name of the place, or
the street it is on." Adding is said to a screen reader and nowhere on the page, as
moving is, the same sentence whether the plus or the sheet added it: the day's list
takes the place, which is how it is told.

The city panel: over the rows, a field of its own for typing a city, the slim pill a
start or end of the day is searched for in, 36px on `paper` inside a hairline that takes
the accent while it is typed in, its words at the small step like the names under it,
with its glass in the column the pins stand in and its words where the names start. Under it, headed "Cities nearby", one list of the towns
near the day's city and the best known cities in its country, together and nearest
first, in rows the same as a place's but with the name alone: a pin in the accent, the
name at the small step and nothing under it, and the same highlight. At the far end of
the row, how far the city is from the day's city in a straight line, "58 km", at the
micro step in `ink-muted` with even figures, so a column of them lines up; a straight
line is all it claims, and no time is given, since nothing here knows how the road
runs. Once something is typed the heading is "Matching cities". Every city the trip already goes
to is left out of that list, the day's own among them: the pill already says it, and
the list is for somewhere the trip has not been yet, as is anywhere closer than 15 km,
which is the city's own suburbs. There is no list of either to be had from the places
provider, so both are made from landmarks, each counted to the town its address puts
it in and ranked by how many landmarks each town has: the country's best known
landmarks for its cities, and the places people go to stay on a weekend away from the
city for the towns near it, since asked for anything near a city the provider answers
with the city itself. Each is asked once a day, for each country and for each city,
and kept, worked out on the server as soon as a trip is opened in a city or a day is
moved to one, and asked for by the pill as the pointer or the focus reaches it rather
than when it is pressed, so the panel opens on the list rather than waiting for it.
Both are rough at their tails, where a town with one landmark can come
up as the hamlet the landmark stands in. Typing a city lists
the cities that match, nearest the day's city first, each the trip already goes to with
its dot in the pin's place and any other with a pin, since a city has no colour until a
day is in it, each with its distance at the end of its row as above, which the provider
measures from the day's city at no charge, and the city the day is in ticked there
instead, where a place's plus stands. Choosing
one moves the day there, and with it the days straight after it that were in the same
city and have nothing planned on them yet, up to the first that was somewhere else or
has a stop on it. A later day with a stop has been planned in its city, so it stays,
and the days after it stay with it; the days before the one moved never move, and
nothing on a moved day moves with it. A day added to the end of the trip is in the city
the last day was in. An empty day opens the map on its city, so the next city of the
trip is where the map goes when its first day is chosen.

## The map

A line is drawn between each pair of points in travel order, under the markers. The
pattern is the mode and nothing else, and the colour is the leg:

```
drive      4.6px  solid
transit    4.6px  dash 9 5
walk       5px    dash 0.5 8, round
```

Each leg of a day takes the next ink in this order and the seventh starts again:
terracotta-700, sage-700, terracotta, neutral-700, sage-600, terracotta-900. Two legs
in the same mode one after the other are the same pattern, and where they run along
the same road they were one line; the colour is what makes them two. The order
alternates the accent with sage and the warm grey, so no two neighbours sit on the
same ramp.

One table in `src/features/trip-map/route-style.ts` holds the three pattern rows and
the ink order, and both the map and the key read from it, so a line and the sample
that explains it cannot drift apart. Google draws a dash or a dot as a symbol repeated
along an invisible line rather than as a stroke pattern, which is why each row also
says what shape it repeats, and a dash in the key is the length the map actually draws.
The printed map cannot pattern a line at all, so on paper the colour is all that tells
one leg from the next.

Every leg also states its mode in words in the list, so the pattern is a reminder and
not the only source of the fact.

The route key sits in the bottom left and lists all three modes, in the order Google
lists them, whenever the day has a line on it. It is the notation, so it does not
change with the modes this particular day happens to use, and its samples are drawn in
the same muted ink as its words: a coloured sample would say the colour meant something.
That is on a desk: a phone has no room for a key under its map, and draws each leg
between the cards of the two places it joins instead, in the row of the day's places
along the map's foot (see Layout). The markers have no key of
their own, because a numbered disc in the order you visit them and a named marker for
the ends of the day explain themselves.

The map's own geometry is styled onto the warm ramp: cream ground, raised roads, sunken
parks, and water in neutral 300 rather than a blue. Photography was tried in its place
and taken out again. It is somebody else's palette, it dictates the page from
underneath, and a product whose whole surface is one warm ramp cannot have its largest
element opt out of it. Every one of Google's controls is off and ours are drawn over the
map instead: the search in the top left, the route key in the bottom left, and in the
bottom right the button that fills the screen with the zoom pair under it, where a thumb
reaches first. That button is two arrows out to opposite corners, turned back in once
the map fills the screen. Each of those three is a glyph alone, so each is titled with
the name it is read out by: "Full screen", or "Exit full screen" once it is, "Zoom in"
and "Zoom out". On a phone the map is a view of its own carrying none of them, only the
days across its top and the day's stops along its foot (see Layout). What the map is drawn on is not offered as a choice. There is one ground,
and it is the product's own.

## Motion

Six things animate: reordering a stop, the trip's actions unfolding, a place's sheet
arriving and leaving, the chosen day's pill moving along the strip, the export's bar while
its file is drawn, and the search on the map, whose movement is its design file's and is written out under Components and in
`place-search.css`: its glow on and off, a quick search sinking a little as it is
pressed and gliding along when an arrow moves the row, the pill's colours and chevron turning, its
dot popping and name sliding in on a move, the empty field's words turning over, a
and a spinner while it waits. A city's dot
also turns to the next city's colour over 200ms `ease-out` when what it marks changes
city, with the name beside it, so the pill in the search does not flash as days change.

Reordering: `transform` over 160ms `ease-out` on the card being moved and on the cards
displacing around it. Nothing else, no opacity, no scale. A card carried by a finger is
not animated at all: it is wherever the finger is, at once, which is the
finger moving it rather than the page.

The trip's actions: `grid-template-columns` from `0fr` to `1fr` over 200ms `ease-out`,
so the row grows from nothing without anything having to know how wide the buttons are.
It is the one hover transition in the product, and it earns the exception because the
movement is the affordance: a group that simply appeared would read as the row
rearranging itself rather than as something folded away that has opened.

A place's sheet: `transform` from wholly off the left edge of the window to its place,
200ms `ease-out` on opening, and back out the same way, 160ms `ease-in` on closing.
Nothing else moves, no opacity. It is laid over the map, and a sheet that appeared in
one frame read as the map being replaced rather than covered; sliding out is how it
says where it went. The picture viewer it opens is the whole window and appears at once.

The chosen day's pill: `translate` and `width` over 250ms on `cubic-bezier(0.22, 1, 0.36,
1)`, which covers most of the way at once and settles into the rest, so a choice is
answered straight away and still seen to travel. One pill for the strip rather than one
per tab, so choosing a day moves it there rather than one going out and another coming
on, the way a phone app's tab bar moves its highlight. Nothing else on the strip
moves: a day's words and dot are the same on the pill as off it.

The export's bar: its fill's `width` over 150ms `linear` each time the clock moves it
on, and a spinner beside its words turning once every 800ms. The page setup's chevron
turns over in one frame, as any panel opening does.

Nothing else. No transitions on focus outside the search, any other panel opening, or map
interaction, and no other transition on hover. Those changes are instant.

Focus is a 2px `terracotta` ring at 2px offset, visible immediately, on every
interactive element.

Under `prefers-reduced-motion: reduce`, reordering, the sheet, the day's pill, a city's
dot and everything in the search are instant too, and the empty field's words stay on
the first of them rather than turning over. The spinner still turns, since it is what
says the search is waiting, and so does the export's, for the same reason; the export's
bar steps rather than slides.

## Print

The printed page is a first class target, not a fallback. The sheets are drawn to the
design for them, "PlanToGo trip PDF", in everything but the lockup and the map, which
are the product's own.

One column. No tabs, no controls, no navigation.

```
@page { margin: 0; }
```

The page has no margin of its own. A sheet carries its margins as its own padding, 48px
over, 56px either side and 32px under on A4, in the same proportion to the page on A5,
and is drawn on `sheet`, a step lighter than `paper-raised`, which runs to the paper's
edge. Behind the sheets the page is `sheet` too, so the hair a sheet is kept short of
its page by reads as more of it. Every row sets `break-inside: avoid`, and every sheet
after the first sets `break-before: page`.

The display face on paper is Fraunces at 900, at its softest and its smallest optical
size, where it is as round and as even as the face the design was drawn in. That face
carries no Vietnamese and this one does. It is the one exception to two families, on the
sheets and nowhere else, and it is fetched when a sheet is first drawn rather than with
every page that could draw one. Body type on paper is Be Vietnam Pro, as everywhere.
Nothing in the display face on paper is set under 1.25 where a place name can reach it,
the trip's name included, since the traveller writes it; only the heading over the list
of days, which is the same three words on every trip, is set tighter. A label over what
it names is in capitals, tracked wide: the trip and its dates at the head of a sheet,
"Route", "Where you sleep", the strip's numbers, the ends of the day. Every size on a
sheet is the design's own at the middle size of words, and the words are printed
smaller or larger by one factor every size is multiplied by, so a sheet keeps its
proportions.

The cover opens on a bar over a hairline: what the sheets are, "Trip itinerary", in
capitals of `terracotta-800` on a pill of `terracotta-100`, and the lockup on the right.
Under it, the trip's name at 60px in the display face, its dates, and what it comes to
as three pills, the days on `terracotta-100`, the cities on `sage-100` and the stops on
`neutral-100`. Then its
route, each stay in a city in order with its dates under it and an arrow in the accent
on to the next, in a line that wraps rather than squeezing its names; a city come back
to is a second stay, and a trip kept before days had cities has no route to draw. Then
where each night is spent. Every day but the last is followed by a night, spent where the next day
leaves from, or where this one finishes when the next leaves from nowhere, and named
with the city of the day before it. Nights in one place one after another are one row,
and nights with nowhere in the plan are one row saying how many.

After the cover, every day of the trip on a line under "Day by day": the day, its city in
the display face in `terracotta-800` over its date, its places, each name cut to what
comes before the provider's dash or bracket, and its hours at the far end. On paper
narrower than A4 is wide, the hours go under the places.

A day's sheet: the head, which day in `terracotta-700` over the city it is in at 40px,
then a strip of what the day comes to between a rule of ink 2px heavy and a hairline,
as many columns as there are numbers: when it leaves; when it is over, in the words of
the row it points at, back by when it ends where it began, finish by when it ends
somewhere else, done by when it ends at its last stop; how many stops; how long is spent
travelling; and on a day with walking in it, how far on foot. With the day summary left
off, the strip goes and its rule of ink stays under the head, as on a sheet that carries
the day on. Then the map if it was asked for, and the day down a column of times. The head carries the trip's name and
never a city's, since a trip's days can be in different cities; the city is the day's
own heading.

The rows of a day: each time in a column of its own on the left, the marker beside it,
and the rest to the right. A stop is when it is reached over when it is left, its number
on a `terracotta` disc, the colour the map marks it with, and its name in the display face, with its address, its hours in
`sage-800` on every stop, a place closed that day included, since the sheets carry no
warnings, then the traveller's note
behind a rule of `neutral-300`. An end of the day is a sage square with the glyph the map
marks it with, the house where the day starts and the flag where it finishes, and the
place on a card of `sage-100` under what it is: leave from, finish at, or back at.
Between two rows, the leg: how long, a length of the dotted thread with the way's glyph
on a disc over it, and the way and how far, which opens the journey in Google Maps. The
words and the glyph are in the ink the map draws that leg's line in, the disc a wash of
it. The thread is `neutral-300` whatever the leg, and unbroken from one place's mark to
the next: it runs on from under a mark to the foot of that place's row, through the
leg's row, to the next mark, touching both. With the legs left off, the rows keep a gap
of their own, and the thread is kept: it runs down that gap to the next mark instead.

A sheet to write on after a day is headed as the day's sheet is, "Notes" ahead of which
day, and ruled every 34px in `neutral-200` from a rule of ink to its foot. Every sheet
ends in the same foot, over a hairline: made with plan2go, as the front door says it,
and which sheet it is of how many, counting every sheet.

Every run of sheets is dealt by measuring it: the cover, whose rows are the trip's
stays; the list of days; and each day. Rows go onto a sheet under what
opens it until the next would not fit, then onto a sheet that carries on under the head
again, marked continued where it picks a list up part way through. A sheet is never
fuller than a page and a row is never cut in two, and a first sheet whose opening leaves
no room for even its first row, which small paper can do to the cover, hands the row on
rather than running past its foot.

The map on paper is a picture of the ground and the routes with nothing on them, wide
and low, a little under three to one, as wide as the rows in a frame 28px round on
`neutral-100`. It is asked for at a centre and a zoom worked out from the day rather than
left to the provider, and the live map's own markers are laid over it where those
numbers put each place: the numbered discs for the stops and the sage squares for the
ends, the house where the day starts and the flag where it finishes. On paper they
are drawn smaller, 21px where the live map's are 26px, since the picture is a strip
across the sheet rather than the whole window. The provider's pins were its own, and
drew both ends of the day as the same green pin.

In ink alone, everything the accents pick out is ink, every tint of them is
`neutral-100`, and the pictures are grey.

The export is chosen in a window over the whole page, under the deepest shadow:
the choices down a column 320px wide on the left, and the sheets on the right exactly
as they will print, redrawn as each choice changes, with the name of the one at the top
held over them. The column opens on a switch of two, the full trip or the cover only,
the chosen one filled in `terracotta-800`, the cover alone being the trip at a glance.
For the full trip the days follow as chips five across, each its weekday over its date,
every day with something on it chosen to begin with and filled in `terracotta-800`, and
a day with nothing on it dashed and out of reach; beside the heading, a word that takes
all of them, Select all, or none, Clear. Then what the file includes, as eight toggles
two across, each a glyph and its words on one line: the cover page, the route map, the
notes on stops, the travel between them, addresses, opening hours, a ruled page for
notes after each day, and the day summary, the strip of what each day comes to. The route
map, the travel, addresses, opening hours and the day summary are on to begin with, and
the cover page, the notes on stops and the ruled pages off;
one that is on is `terracotta-100` inside `terracotta-300` with its words in
`terracotta-900`, and one that is off is a `neutral-200` outline with its words in
`neutral-500`. For the cover alone, neither the days nor what is included is shown.
Last in the column is the page setup, folded to a line saying the paper, which way up
and the ink, A4 · Portrait · Colour, and opening to a track of pills for each of those
and for the size of the map and of the words, the one in force raised on `sheet`; the
map's size is offered only for the full trip. A column longer than the window scrolls
inside itself under a 2px line drawn along its edge, as the day's list does, rather than
the browser's own bar, which took its width out of the column and pushed the choices
left of centre whenever they ran long. Under the column, over a hairline, the
file's name in a field shaped as a pill with .pdf after it, and the button, which names
the one format and what the export comes to: Export PDF · 21 pages. The sheets are drawn
at the paper's own size and the page rule is told the same size and way up, so what is
chosen here is what comes out and nothing is shrunk or turned to fit.

The file is drawn on the server. The export is spelled out in the address of a page
that holds the sheets and nothing else, a browser of our own opens that page, waits
for the sheets to be dealt and every picture on them to arrive, and prints it with the same
stylesheet the preview is drawn with. The file comes back as a download under the name
in the field, so what was looked at and what comes out are one thing, the same on
every reader's machine, and nothing of a print window, no header, no date, no address,
is in it. While it is drawn the column is faded and out of reach, and the
button becomes a bar filling in `terracotta` over `terracotta-200`, with a spinner and
how far along it is, and Cancel under it. The server says nothing until the file is
done, so the bar is paced by the clock, quick at first and slower as it goes, never full
before the file is, and the file arriving fills it. Once the file is saved, a `sage-600`
pill says Saved over the file's name and how many pages it is, for a moment, before the
button comes back. The focus goes from the button to Cancel and back with it, so it
never falls out of the dialog and out of reach of its Escape. A name typed in the field
is tidied as the suggested one is, of what a file system objects to and of a .pdf on its
end, and runs to 120 characters at most, so the file is saved under the name the dialog
says it was. A name cleared from the field, or one with nothing left once tidied, is
said over it, politely, so it is read out once the typing pauses rather than cutting in
on it, in the bubble every field's notice hangs in, above the field rather than below so
it does not cover the button, and over the column, so no room is kept for it and
neither the field nor the button moves when it comes and goes; the field's edge is `terracotta-700`, its focus is that edge turning
`terracotta` as on every other text field, with no ring around it as well, and
the button is faded and out of reach until it has a name, as it is with no day chosen,
saying why to whoever reaches it. One file holds 60 days at most: the first 60 with
something on them are chosen to begin with, and more than that chosen is said under the
days with the numbers in it, the button out of reach until fewer are. A file that could
not be drawn is a sentence under the button saying what happened and what to do, and a
server that answered without saying why is told apart from one that was never reached.
Closing the dialog while the file is drawn calls it off, and the server's browser stops
drawing it. The browser's own print command still prints the preview while the dialog
is open, and the open day while it is not.

On a phone the export is not a dialog but the Export view, a page of its own under the
bar of views, drawn as the Export tab of design 1b of "PlanToGo iPhone app" draws it,
with every choice the dialog has but the switch of the full trip and the cover alone.
"Export PDF" at the headline step, and under it the trip's name and its dates at the
small step in 500 `ink-muted`. **Days** with **Select all** or **Clear** at the right
in `terracotta-800`, and the days five across, 6px apart: a card for each, rounded at
the `panel` radius inside a 1.5px edge, "DAY 1" at the label step in bold capitals over
its date in bold at the body step over its city at the label step, the number and the
city faded; on `paper-raised` inside `rule`, and filled in `terracotta-800` with its
words in `paper` while it is in the file. A day with nothing on it is dashed and cannot
be chosen. **Include**, and under it one card of `paper-raised` rounded at the `card`
radius holding a switch to a row: its name at the place step in 600, and a track 46px
by 28px, `terracotta` with its knob at the end while on and ink at 18 percent while off,
the knob 22px across on `sheet` under `shadow-sm`. Cover page, Route map per day,
Addresses, Opening hours and Notes, as the design lists them, then Travel between stops,
Notes pages and Day summary, which it has no row for. The page setup folded to its line
on a card drawn as the preview's is. The file's name under its own heading, in a pill
50px tall on `sheet` with .pdf after it, and what is wrong with it said under it. Then
**Export PDF** with the pages it comes to, the download glyph before it, on the accent's
solid pill. While the file is drawn, a card of `paper-raised` saying "Creating" and the
file's name, with **Cancel** at its end and a bar 8px tall filling in the accent under
it; once it is saved, a card of sage 100 with a tick on a disc of sage 600, "Saved" and
the file's name in sage 900, and **Done** at its end, which puts the button back. Not
where the file went, which the browser decides and a phone's may ask about first.
Everything over the button is faded and out of reach from the moment the file is asked
for until Done. Escape goes back to the day, and every other way out is the bar of
views.

The preview is a card drawn as the setup's is: a page in small at its front, a bar of
the accent over a block of sage where the map is and two lines of ink, then **Preview**
at the place step in bold over how many pages the export comes to, and a chevron. It
opens over the whole window and the bar of views, on the sunken ground the desk's
preview stands on: **Close** in `terracotta-800` on the left, which page is in the
middle of how many in the middle, "Page 2 of 6", and **Export** on the accent's solid
pill on the right, which puts the preview away and begins the file, or, with no name to
save it under, puts the preview away and takes the keyboard to the name. Under them the
sheets themselves, the same ones the desk's preview draws, one beside the next in a row
that snaps to each, every page scaled to 300px wide on a phone the design's width, or
as tall as the window has room for less 60px kept clear at its foot, with the pages
either side peeking in 51px and 16px apart, each on the deepest shadow. Escape puts it
away. Until it is opened the sheets are laid out unseen, for the count and for the
browser's own print command, which prints them while the view is up, the preview open
or not.

## Banned in this product

Skeleton shimmer. While travel times are resolving, show the last known value, or a
single line of text saying what is being worked out.

Toasts for anything already visible on screen.

An icon standing in for a word. An icon only control is allowed where its meaning is
conventional, which in this product means close, clear, and zoom, and it carries an
accessible name. Nothing this product actually knows about, a mode of travel, a day, a
conflict, is ever an icon alone.

Pure white or pure black, anywhere.

A third accent, or red, amber, and green used as status.

Decorative gradients, glassmorphism, backdrop blur, mesh backgrounds. The dotted thread
is a rule drawn as a gradient, which is the only gradient in the product. The page
behind the question that deletes a trip is dimmed and blurred, which is the only blur:
it is the one question that cannot be left half answered, and the ground going quiet
is what says so.

Shadows on anything that is not floating over something else, but for a stop's card in
a phone's day, which the phone's day design raises on `shadow-sm`.

Numbers that count up or animate into place. Times appear at their value.

Anything that only appears on hover, since half the users are on a phone.

Emoji used as interface iconography.

Full width hero imagery inside the app shell.

A modal for anything that could be edited in place.

Placeholder text standing in for a label. A field whose label would crowd the shape it
lives in, the search pill on the map, carries a visually hidden label and repeats it in
the placeholder.

Card grids of three equal boxes.

A third type family.
