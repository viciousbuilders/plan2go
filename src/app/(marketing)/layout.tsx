import type { Metadata } from "next";
import { Credit } from "@/ui/credit";

/**
 * The public face of the site: everything a person sees before they have a
 * trip. It owns the page shell and the credit at the foot, so a second page
 * out here inherits both instead of copying them. The lockup is the start
 * page's own, over its line, since on a desk it is centred with it.
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

/** As wide as the start page's design: a phone's column, or a desk's. */
const COLUMN = "mx-auto w-full max-w-[560px] md:max-w-[1040px]";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-5 md:px-6">
      {children}
      <footer
        className={`${COLUMN} py-8 text-center text-[13px] font-medium text-ink-muted md:py-6`}
      >
        <p>
          <Credit />
        </p>
      </footer>
    </div>
  );
}
