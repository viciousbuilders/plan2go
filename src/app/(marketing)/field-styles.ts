/**
 * What every field on the starter page is drawn in.
 *
 * They sit one under another in a single card, so any difference between them
 * reads as a difference in kind rather than as a difference in what they are
 * asking for. One pill, stated once.
 *
 * The values come from the design canvas in storage/, "plan2go First Page
 * v3", mapped onto this product's own tokens rather than copied as raw
 * colours: its accent is our terracotta, its second accent our sage, its
 * raised ground our paper-raised, its ink alphas our ink at the same alpha.
 * Nothing here reaches for a value the palette does not already have.
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
 * - Type: 40 to 60 for the headline as the window widens, 38 on a phone, and
 *   32 for the dialog's heading, 26 on a phone, both in the headline face; 19
 *   for the sentence under the headline, 17 on a phone; 17 for the button and
 *   the box's heading; 15 for labels and steps; 14 and 13 for the smaller
 *   lines and code; 12 for the names of the groups of apps.
 * - Lines: ratios, 1.05 for the headline and 1.5 for most text.
 * - Height: 56 for a control on one line, 72 for one on two, 40 for a round
 *   button such as a Copy, and 34 or 36 for a link drawn as a pill.
 * - Cards: 32 in from their edges at a 32px radius on a desk, 20 in at 28 on
 *   a phone; the boxes inside them at 28, 20 and 16.
 */
export const FIELD_SHELL =
  "w-full rounded-pill border border-rule text-[16px] leading-6 text-ink";

export const FIELD_GROUND = "bg-paper-raised";

export const FIELD_LABEL = "text-[15px] leading-none font-bold text-ink";

/** The label and its field, which are one thing and are spaced as one. */
export const FIELD_STACK = "flex flex-col gap-2.5";
