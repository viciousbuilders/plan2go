import type { ComponentType } from "react";
import type { IconProps } from "@/ui/icons";

interface SheetRowProps {
  readonly icon: ComponentType<IconProps>;
  readonly title: string;
  /** What the row does, in a few words under its name. */
  readonly detail: string;
  /** The row that ends the trip, drawn in the accent rather than in sage. */
  readonly ending?: boolean;
}

/**
 * What a row of the trip's menu says on a phone, where the menu is a sheet
 * and the row a card with room to say what it does: its glyph on a 38px disc,
 * its name in bold at the body step, and what it does under the name at the
 * meta step in muted ink. The disc is sage 200, as a way of covering a leg's
 * is in its sheet; on the row that ends the trip it is the accent's 200 tint
 * and the name is in the accent's deepest brown, so it is never the row a
 * finger lands on by accident. Not drawn on a desk, where the row is its
 * glyph and a word.
 */
export function SheetRow({ icon: Icon, title, detail, ending = false }: SheetRowProps) {
  return (
    <>
      <span
        className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-pill lg:hidden ${
          ending ? "bg-terracotta-200 text-terracotta-800" : "bg-sage-200 text-sage-800"
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
