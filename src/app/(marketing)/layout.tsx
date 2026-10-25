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
 * As wide as the canvas draws the page: 1200px at most, 32px in from the
 * window's edges, and 20px in on a phone. Down from the top by 48px, and by 8
 * on a phone, whose own bar is already over the top of it, with the foot of
 * the page kept to the bottom of the window however little is above it.
 */
const MAIN = "mx-auto flex w-full max-w-[1200px] grow flex-col px-5 pt-2 pb-12 sm:px-8 sm:pt-12 sm:pb-24";

/** The foot's own measure, as the earlier canvas drew the whole page. */
const COLUMN = "mx-auto w-full max-w-[1280px] px-8 lg:px-16";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className={MAIN}>{children}</main>
      {/* A step lighter than the page rather than a step darker, and with no
          rule over it, as the canvas has it: the foot of the page, not a
          band across it. */}
      <footer className="bg-paper-raised">
        <div className={`${COLUMN} py-5 text-[13px] leading-5 text-ink-muted`}>
          <p className="text-center">
            <Credit />
          </p>
        </div>
      </footer>
    </div>
  );
}
