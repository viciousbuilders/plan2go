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

const COLUMN = "mx-auto w-full max-w-[1060px] px-8";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className={`${COLUMN} flex grow flex-col justify-center pt-12 pb-16`}>{children}</main>
      <footer className="border-t border-rule bg-paper-sunken">
        <div className={`${COLUMN} py-6 text-meta text-ink-muted`}>
          <p className="text-center">
            <Credit />
          </p>
        </div>
      </footer>
    </div>
  );
}
