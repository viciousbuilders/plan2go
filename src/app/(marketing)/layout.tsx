import type { Metadata } from "next";
import Image from "next/image";
// Imported rather than served from public/, so Next sizes and hashes it.
import lockup from "../../../logo/logo-text.png";
import { Credit } from "@/ui/credit";

/**
 * The public face of the site: everything a person sees before they have a
 * trip. It owns the page shell, the lockup over the top and the credit at the
 * foot, so a second page out here inherits both instead of copying them.
 */
export const metadata: Metadata = {
  title: "plan2go",
  description:
    "Plan a multi-day trip, see how far apart the places really are, and see how long a day actually takes. No account needed.",
};

/** As wide as the start page's design: a phone's column, or a desk's. */
const COLUMN = "mx-auto w-full max-w-[560px] md:max-w-[1040px]";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col px-5 md:px-6">
      <header className={`${COLUMN} flex items-center pt-14 md:py-7`}>
        <Image
          src={lockup}
          alt="plan2go"
          sizes="140px"
          priority
          className="h-auto w-[112px] md:w-[140px]"
        />
      </header>
      {children}
      <footer
        className={`${COLUMN} pt-7 pb-8 text-center text-[13px] font-medium text-ink-muted md:py-6 md:text-[13.5px]`}
      >
        <p>
          <Credit />
        </p>
      </footer>
    </div>
  );
}
