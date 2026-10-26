/**
 * What every field on the starter page is drawn in.
 *
 * They sit one under another in a single card, so any difference between them
 * reads as a difference in kind rather than as a difference in what they are
 * asking for. One pill, stated once.
 *
 * The values come from the design canvas in storage/, "plan2go First Page
 * v5", mapped onto this product's own tokens rather than copied as raw
 * colours: its accent is our terracotta, its second accent our sage, its
 * ground and raised ground our paper and paper-raised, its lightest card
 * our sheet, and its many greys of ink our ink-muted, for whatever is said
 * second. The city's placeholder is in it too: the faint ink stood 3.6:1
 * from the field, under the 4.5:1 its words need. Nothing here reaches for
 * a value the palette does not already have. A field is a well of the
 * page's own ground in the raised card, with no edge until it has the
 * cursor, under a label in small capitals, as the canvas draws them.
 *
 * Neither the padding nor the ground is baked into the shell, and that is
 * deliberate. Two Tailwind utilities for one property do not resolve by the
 * order they are written in a class string, they resolve by the order the
 * generated stylesheet happens to put them in, so a shared value that some
 * fields then override is a coin toss rather than a default. Each field states
 * its own, once.
 *
 * The whole page keeps to one scale, so a new piece of it has values to pick
 * from rather than to invent:
 *
 * - Frame: one, from first-page.css. Everything is in from the window's
 *   sides by --across and down from the top or up from the foot by --room:
 *   the words on the left, the form's panel, and the lockup and the credit in
 *   the right hand corners. The words on the left run out to one edge,
 *   560px at most, the headline filling it on its one line. The form is
 *   420px at most, 28px of room round it and 24 between its questions.
 * - Type: eight steps and nothing between them, 12, 13, 14, 16, 18, 20, 24
 *   and 32, and the headline. The headline is sized to that measure, 36 to
 *   48 on a desk and 40 on a phone, and the dialog's heading is 32, 24 on a
 *   phone, in the headline face, as are the day and its numbers on the card
 *   that shows a day. 20 for the answer and the action, the city as it is
 *   typed and the button, which at 20 is large type, as bold words on the
 *   accent have to be at its contrast. 18 for the sentence under the
 *   headline, the day on its card and the heading over an app's steps. 16
 *   for the AI box's heading, the dialog's steps and the line under its
 *   heading; the headings in the body face, as every heading under the
 *   headline is. 14 for the lines that say what to do, the dates, which the
 *   dates field sets at 16 only in a field 400px wide or more, the dialog's
 *   buttons, a city in the list and a place on the card. 13 for the labels,
 *   in capitals, the count of days, the sentence to paste, code, the links,
 *   the notes under an app's steps and a city's country in the list. 12 for
 *   small print: the card's, the list's heading, the credit, and an error
 *   under the form, at the planner's own size for one.
 * - Lines: 1.08 for the headline face, 1.6 for the sentence under the
 *   headline, 1.5 for any other text that can run to two lines, and 1 or 1.2
 *   for text on one.
 * - Height: 56 for every control in the form, the city, the dates and the
 *   button; 24 for a pill, the count of days and the card's; 36 or 40 for a
 *   round button such as a Copy.
 * - Corners: 28 for a card, the form and the day; 20 for a box in the left
 *   hand column, the sentence to paste and what to ask next, which are the
 *   same box in two colours and padded alike; 16 for the dialog's code; a
 *   pill for every field, button and count.
 * - Icons: one stroke, 2.75, at 14 beside 12 and 13px words and in the
 *   card's marks, 18 in a round button or badge and beside larger words, and
 *   20 in the city's field. The plane on the button keeps the size and turn
 *   it was given in commit 435d805.
 */
export const FIELD_SHELL =
  "w-full rounded-pill border-2 border-transparent text-[16px] leading-6 text-ink";

export const FIELD_GROUND = "bg-paper";

export const FIELD_LABEL =
  "text-[13px] leading-none font-bold tracking-[0.05em] text-ink-muted uppercase";

/** The label and its field, which are one thing and are spaced as one. */
export const FIELD_STACK = "flex flex-col gap-2.5";
