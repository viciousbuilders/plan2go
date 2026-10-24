/**
 * What every field on the starter page is drawn in.
 *
 * They sit one under another in a single card, so any difference between them
 * reads as a difference in kind rather than as a difference in what they are
 * asking for. One pill, stated once.
 *
 * The values come from the design canvas in storage/, mapped onto this
 * product's own tokens rather than copied as raw colours: its accent is our
 * terracotta, its surface our paper-sunken, its ink alphas our ink-muted and
 * ink-faint. Nothing here reaches for a value the palette does not already have.
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
 * - Type: 56 and 32 for the two headings, in the headline face; 18 for the
 *   sentence under the first; 16 for what a control holds and the line beside
 *   the second heading; 14 for labels, help and the example prompt; 13 for the
 *   small controls, code and the foot; 12 for the smallest labels.
 * - Space: steps of 4, mostly 8, 12, 16, 24 and 32 inside things, and 48, 64
 *   and 80 between them.
 * - Lines: whole pixels for the text sizes, 28 for 18, 24 for 16, 22 for 14
 *   and 20 for 13; the two headings, whose size follows the window, keep a
 *   ratio instead.
 * - Height: 56 for a control on one line, 72 for one on two, 28 for a small
 *   one, a tab or a Copy, and 44 for the box a Copy sits in.
 * - Cards: 24 in from their edges on a phone and 32 from md, at the card radius,
 *   with what sits inside them at the chip radius.
 */
export const FIELD_SHELL =
  "w-full rounded-pill border border-rule text-[16px] leading-6 text-ink";

export const FIELD_GROUND = "bg-paper-raised";

export const FIELD_LABEL = "text-[14px] leading-none font-semibold text-ink-muted";

/** The label and its field, which are one thing and are spaced as one. */
export const FIELD_STACK = "flex flex-col gap-3";

/** A line of help over a box, such as what to do with the address in it. */
export const FIELD_HINT = "text-[14px] leading-5.5 text-pretty text-ink-muted";
