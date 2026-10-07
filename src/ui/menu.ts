/**
 * One row of a menu. A word with a glyph in front of it, the way every menu
 * anybody has used is drawn, so nothing here has to be learned. Every menu in
 * the product draws its rows with this, so any two are the same rows at the
 * same height.
 *
 * On a phone a menu comes up from the foot of the window as a sheet, and a row
 * is a card of its own there, the way a way of covering a leg is in its
 * sheet: on the sheet's paper inside a 2px hairline, rounded at the panel's
 * radius, at least sixty four tall, a finger's room and then some.
 */
export const MENU_ITEM =
  "flex w-full items-center gap-[10px] rounded-chip border-0 bg-transparent px-3 py-[9px] text-left text-small/none font-semibold text-ink hover:bg-neutral-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta max-lg:min-h-16 max-lg:gap-3 max-lg:rounded-panel max-lg:border-2 max-lg:border-rule max-lg:bg-sheet max-lg:px-[14px] max-lg:py-[13px]";

/**
 * The line in a menu between what changes a thing and what ends it. Not on a
 * phone, where every row is a card and the gap between them parts them.
 */
export const MENU_RULE = "mx-[10px] my-[5px] h-px bg-rule max-lg:hidden";
