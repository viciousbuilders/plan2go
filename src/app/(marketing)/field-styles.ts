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
 * our sheet, its ink alphas our ink at the same alpha. Nothing here reaches
 * for a value the palette does not already have. A field is a well of the
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
 * - Type: 40 to 54 for the headline as the window widens, and 32 for the
 *   dialog's heading, 26 on a phone, both in the headline face, as are the
 *   day and its numbers on the card that shows a day; 22 for the city as it
 *   is typed; 17 for the sentence under the headline and the button; 15 for
 *   the AI box's heading and the dialog's steps; 14 and 13 for the smaller
 *   lines, code and the labels, which are in capitals; 12 and 11 for the
 *   day card's small print, the names of the groups of apps and the credit.
 * - Lines: ratios, 1.08 for the headline and 1.5 to 1.6 for most text.
 * - Height: 64 for the button, 68 for the city, 72 for the dates, 36 or 40
 *   for a round button such as a Copy.
 * - Cards: the form 24 to 48 in from its edges as the window widens, at a
 *   28px radius; the day card at 24, the sentence to paste at 20, and the
 *   dialog's code at 16.
 */
export const FIELD_SHELL =
  "w-full rounded-pill border-2 border-transparent text-[16px] leading-6 text-ink";

export const FIELD_GROUND = "bg-paper";

export const FIELD_LABEL =
  "text-[13px] leading-none font-bold tracking-[0.05em] text-ink-muted uppercase";

/** The label and its field, which are one thing and are spaced as one. */
export const FIELD_STACK = "flex flex-col gap-2.5";
