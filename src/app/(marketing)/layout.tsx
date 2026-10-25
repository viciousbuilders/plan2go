import type { Metadata } from "next";
import { Credit } from "@/ui/credit";

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
 * words sit is the page's own.
 */
const MAIN = "flex grow flex-col";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <main className={MAIN}>{children}</main>
      {/* Who made this, small in the bottom corner, as "plan2go First Page
          v5" has it: over the foot of the form's panel on a desk, which
          keeps that room clear for it, and after everything on a phone,
          where the panel is in the middle of the page. In the muted ink
          rather than the canvas's lighter one, which is too faint to read
          at this size on that panel. */}
      <footer className="px-[clamp(24px,5vw,60px)] pb-[30px] text-right text-[12px] leading-none text-ink-muted min-[860px]:absolute min-[860px]:right-10 min-[860px]:bottom-[30px] min-[860px]:p-0">
        <Credit />
      </footer>
    </div>
  );
}
