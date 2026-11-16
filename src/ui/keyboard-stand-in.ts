/** What a field says about the keyboard it wants, copied onto its stand-in. */
const KEYBOARD_ATTRIBUTES = [
  "enterkeyhint",
  "inputmode",
  "autocomplete",
  "autocapitalize",
  "autocorrect",
] as const;

/**
 * Brings a phone's keyboard up inside a press for a field that is not on the
 * page yet, such as the search over a map still sliding in.
 *
 * A phone brings its keyboard up only for a field focused inside the press
 * itself, and keeps it up as the focus goes from one field to another. So a
 * stand-in takes the focus in the press, dressed as the field it stands in
 * for so the keyboard that comes up is the one that field asks for: out of
 * sight in the window's top corner, where a phone has nothing to scroll to,
 * and at 16px, under which a phone zooms the page to a field it focuses.
 * Once the field itself is on the page and focused, the stand-in is let go
 * of and the keyboard stays up for the field.
 *
 * Hidden from a screen reader, which is told of the field itself a moment
 * later. Gives back the letting go.
 */
export function holdKeyboard(like: HTMLInputElement | null): () => void {
  const standIn = document.createElement("input");
  standIn.type = like?.type ?? "text";
  for (const name of KEYBOARD_ATTRIBUTES) {
    const value = like?.getAttribute(name) ?? null;
    if (value !== null) {
      standIn.setAttribute(name, value);
    }
  }
  standIn.tabIndex = -1;
  standIn.setAttribute("aria-hidden", "true");
  standIn.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;margin:0;padding:0;border:0;opacity:0;font-size:16px;pointer-events:none";
  document.body.append(standIn);
  standIn.focus({ preventScroll: true });
  return () => {
    standIn.remove();
  };
}
