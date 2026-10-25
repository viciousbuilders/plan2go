import type { Metadata } from "next";
import { Credit } from "@/ui/credit";
import "./first-page.css";

/**
 * The public face of the site: everything a person sees before they have a
 * trip. It owns the page shell and the footer, so a second page out here
 * inherits both instead of copying them.
 */
const DESCRIPTION =
  "Plan a multi-day trip, see how far apart the places really are, and see how long a day actually takes. No account needed.";

/**
 * What a link to the front door unfolds into when it is pasted into a
 * message: the picture beside this file, opengraph-image.png, over the name
 * and the sentence, at the full width the apps give a picture. Set here
 * rather than on the root layout, so a trip's own link is not given the
 * front door's name in place of its trip's.
 */
export const metadata: Metadata = {
  title: "plan2go",
  description: DESCRIPTION,
  openGraph: { type: "website", url: "/", title: "plan2go", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
};

/**
 * The whole width of the window, since the page's panels run to its edges,
 * and at least its height, so they run to its foot as well. How far in the
 * words sit is the frame's, first-page.css, which the shell carries so the
 * credit keeps to it as the page does.
 */
const MAIN = "flex grow flex-col";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="first-page relative flex min-h-dvh flex-col">
      <main className={MAIN}>{children}</main>
      {/* Who made this, small in the bottom corner where "plan2go First
          Page v5" puts it, in the frame's corner as the lockup is in its top
          one: over the foot of the form's panel on a desk, which keeps that
          room clear for it, level with the foot of the words on the left,
          and after everything on a phone, where the panel is in the middle
          of the page. Said as the band at the foot of the page said it
          before, heart and all: the words in the muted ink, the heart and
          the name a shade darker than the accent. */}
      <footer className="px-[var(--across)] pb-[var(--room)] text-right text-[12px] leading-none text-ink-muted min-[860px]:absolute min-[860px]:right-[var(--across)] min-[860px]:bottom-[var(--room)] min-[860px]:p-0">
        <Credit />
      </footer>
    </div>
  );
}
