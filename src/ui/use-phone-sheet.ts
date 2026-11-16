import type { AnimationEvent } from "react";
import { useState } from "react";
import "./phone-sheet.css";

/** Tailwind's lg, from which a panel is a desk's and goes at once. */
const WIDE_WINDOW = "(min-width: 1024px)";

/** Put away, up, or on its way back down the window. */
type Shown = "closed" | "open" | "closing";

interface PhoneSheet {
  /** Drawn: up, or on its way back down. */
  readonly drawn: boolean;
  /**
   * Up and staying up: what the button that brings it up says it is, and the
   * one time anything on the sheet answers a finger or the keyboard.
   */
  readonly up: boolean;
  /** Brings it up, or back up if it was on its way down. */
  readonly open: () => void;
  /**
   * Sends it back down the window, and takes it down once it is out of it. A
   * sheet already on its way, or already gone, is left as it is, so whatever
   * holds this from an older render, the end of a save, can ask again.
   */
  readonly close: () => void;
  /** On the sheet: which way it is moving. */
  readonly sheetClass: string;
  /** On the sheet: the end of its going, which takes it down. */
  readonly onSheetAnimationEnd: (event: AnimationEvent<HTMLElement>) => void;
  /** On the page dimmed under the sheet, which comes and goes with it. */
  readonly dimClass: string;
}

/**
 * A panel a phone draws as a sheet up from the foot of the window, which
 * comes up from under the window's foot and goes back down under it (see
 * phone-sheet.css). Put away, it is drawn on as it was until it is out of the
 * window, nothing on it answering, and then taken down; `onGone` is told
 * then, for whatever the sheet held to be set back for its next opening.
 *
 * On a desk the same panel may be a menu under its button, and a sheet put
 * away while the window is wider than a phone's is taken down at once. The
 * width is asked at the moment it is put away.
 */
export function usePhoneSheet(onGone?: () => void): PhoneSheet {
  const [shown, setShown] = useState<Shown>("closed");

  const takeDown = (): void => {
    setShown("closed");
    onGone?.();
  };

  return {
    drawn: shown !== "closed",
    up: shown === "open",
    open: () => {
      setShown("open");
    },
    close: () => {
      if (window.matchMedia(WIDE_WINDOW).matches) {
        takeDown();
        return;
      }
      setShown((now) => (now === "open" ? "closing" : now));
    },
    sheetClass: shown === "closing" ? "phone-sheet-leaving" : "phone-sheet-arriving",
    onSheetAnimationEnd: (event) => {
      // Only its own going, not something moving inside it.
      if (event.target === event.currentTarget && shown === "closing") {
        takeDown();
      }
    },
    dimClass: shown === "closing" ? "phone-dim-leaving" : "phone-dim-arriving",
  };
}
