import Image from "next/image";
// Imported rather than served from public/, so Next sizes and hashes it.
import lockup from "../../../logo/logo-text.png";
import { CreateTripForm } from "./create-trip-form";
import { headlineFont } from "./headline-font";
import { PlanWithAi } from "./plan-with-ai";

/**
 * Built once and served as it is, from the edge nearest the reader, rather
 * than drawn afresh on every visit. Nothing on it depends on who is asking:
 * today, which the form opens on, is read from the reader's own clock in the
 * browser, the address an AI app is given from the browser's own, and the
 * zone a trip keeps is decided when it is opened.
 */
export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      {/*
       * What the product is on one side, the form that starts one on the other.
       * The columns are auto-fit rather than a breakpoint, so the pair splits
       * when there is room for both and stacks when there is not, without this
       * page having to name the width at which that happens. A column is never
       * wider than the page, so a phone narrower than one still gets a column
       * that fits rather than a page that scrolls sideways. Two columns sit
       * 24px apart, the same gap as the cards under them; stacked, the words
       * and the form keep more room between them than that.
       *
       * Aligned along their tops, as the canvas has them: the lockup sits level
       * with the top of the card, and the words hang from it. The pair and the
       * way to plan with AI under it are centred in the page together by
       * the layout around them, so what is left over is shared out above and
       * beneath them rather than piled under them.
       */}
      <div className="grid items-start gap-x-6 gap-y-12 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <div className="flex flex-col gap-6">
          {/* Raised by the 4px of clear margin the picture has over its
              drawing, so the drawing itself is level with the card's top. */}
          <Image
            src={lockup}
            alt="plan2go"
            width={336}
            height={124}
            preload
            className="-mt-1 h-auto w-[min(336px,80%)]"
          />

          {/* Broken after "map it," at every size, since the measure is in the
              type's own ems: the first line fits and "share" does not. Left
              to the page's pretty wrapping, a browser without it would put
              "share" on the first line and leave "it." on its own. */}
          <h1
            className={`${headlineFont.className} max-w-[8em] text-[clamp(36px,4.375vw,56px)] leading-[1.05] text-ink`}
          >
            Plan it, map it, share it.
          </h1>

          <p className="max-w-[36rem] text-[18px] leading-7 text-pretty text-ink-muted">
            Add your cities, fill each day with places, see real travel times, and share it as a
            link or PDF.
          </p>
        </div>

        <CreateTripForm />
      </div>

      <PlanWithAi />
    </div>
  );
}
