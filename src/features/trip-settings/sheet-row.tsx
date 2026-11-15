import type { ComponentType } from "react";
import type { IconProps } from "@/ui/icons";

/** The colour of a row's disc, one each so the rows are told apart at a glance. */
export type SheetTint = "plum" | "denim" | "sage";

/** The disc in each colour: its 200 tint, the glyph in its 800. */
const TINT: Readonly<Record<SheetTint, string>> = {
  plum: "bg-plum-200 text-plum-800",
  denim: "bg-denim-200 text-denim-800",
  sage: "bg-sage-200 text-sage-800",
};

interface SheetRowProps {
  readonly icon: ComponentType<IconProps>;
  readonly title: string;
  /** What the row does, in a few words under its name. */
  readonly detail: string;
  /** The colour of the row's disc. The row that ends the trip has the accent's instead. */
  readonly tint?: SheetTint;
  /** The row that ends the trip, drawn in the accent rather than in a colour of its own. */
  readonly ending?: boolean;
}

/**
 * What a row of the trip's menu says on a phone, where the menu is a sheet
 * and the row a card with room to say what it does: its glyph on a 38px disc,
 * its name in bold at the body step, and what it does under the name at the
 * meta step in muted ink. Each row's disc is a colour of its own, plum, denim
 * or sage, so the rows are told apart before their names are read; on the
 * row that ends the trip it is the accent's 200 tint and the name is in the
 * accent's deepest brown, so it is never the row a finger lands on by
 * accident. Not drawn on a desk, where the row is its glyph and a word.
 */
export function SheetRow({ icon: Icon, title, detail, tint = "sage", ending = false }: SheetRowProps) {
  return (
    <>
      <span
        className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-pill lg:hidden ${
          ending ? "bg-terracotta-200 text-terracotta-800" : TINT[tint]
        }`}
      >
        <Icon size={18} strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1 lg:hidden">
        <span
          className={`block text-body/[1.2] font-bold ${ending ? "text-terracotta-800" : "text-ink"}`}
        >
          {title}
        </span>
        <span className="mt-[3px] block text-meta/[1.3] font-medium text-ink-muted">{detail}</span>
      </span>
    </>
  );
}
