"use client";

import { FINGER_ROOM } from "@/ui/finger-room";
import { DownloadIcon } from "@/ui/icons";
import { MENU_ITEM } from "@/ui/menu";
// The dialog's stylesheet comes with the button that opens it, on the page
// from the start, rather than with the dialog, which is fetched when it is
// first opened. Fetched with the dialog, it was a stylesheet the development
// server reloaded on its own, and a page that had lost its link for it stopped
// on "No link element found for chunk" while the stylesheet was being worked
// on. On the page's own stylesheet it is reloaded with the rest. Every rule
// in it is about the dialog's own boxes, its print rules too, so it changes
// nothing on a page where the dialog is not open.
import "./export-dialog.css";

const TITLE = "Export";

/**
 * The two places the trigger is drawn. An editor finds it as a row in the
 * trip's menu, beside Share. A reader has no menu, because exporting is the
 * one thing they can do to the trip, so for them it is a button with its name
 * on it, in the spot on the name row where an editor's menu sits.
 */
const TRIGGERS = {
  menu: { rest: MENU_ITEM },
  heading: {
    rest: `inline-flex h-8 shrink-0 items-center gap-[7px] rounded-pill border border-rule bg-transparent px-[13px] text-small/none font-semibold text-ink-muted hover:bg-neutral-200 hover:text-ink disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta ${FINGER_ROOM}`,
  },
} as const;

interface TripExportProps {
  readonly where: keyof typeof TRIGGERS;
  /** A trip with nothing on any day has nothing to export, and says so. */
  readonly disabled: boolean;
  readonly onOpen: () => void;
}

/**
 * The way the trip leaves the screen. The trigger says only "Export": which
 * days, and what goes on each sheet, are chosen in the dialog it opens, beside
 * a preview of the sheets themselves.
 */
export function TripExport({ where, disabled, onOpen }: TripExportProps) {
  const look = TRIGGERS[where];

  return (
    /* Not on the name's row or in the trip's menu on a phone, where Export is
       one of the views in the bar at the foot of the window, for a reader as
       for an editor. */
    <div className={`relative max-lg:hidden ${where === "menu" ? "" : "flex-none"}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={onOpen}
        className={`${look.rest} disabled:opacity-45`}
      >
        <DownloadIcon size={15} strokeWidth={2.75} className="shrink-0" />
        {TITLE}
      </button>
    </div>
  );
}
