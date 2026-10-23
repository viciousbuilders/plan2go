import Image from "next/image";
// Imported rather than served from public/, so Next sizes and hashes it.
import lockup from "../../../logo/logo-text.png";
import { CreateTripForm } from "./create-trip-form";
import { PlanWithClaude } from "./plan-with-claude";

/**
 * Built once and served as it is, from the edge nearest the reader, rather
 * than drawn afresh on every visit. Nothing on it depends on who is asking:
 * today, which the form opens on, is read from the reader's own clock in the
 * browser, the address Claude is given from the browser's own, and the zone a
 * trip keeps is decided when it is opened.
 */
export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-24 max-[700px]:gap-20">
      {/*
       * What the product is on one side, the form that starts one on the other.
       * The columns are auto-fit rather than a breakpoint, so the pair splits
       * when there is room for both and stacks when there is not, without this
       * page having to name the width at which that happens. A column is never
       * wider than the page, so a phone narrower than one still gets a column
       * that fits rather than a page that scrolls sideways.
       *
       * Aligned along their tops, as the canvas has them: the lockup sits level
       * with the top of the card, and the words hang from it. The pair and the
       * way to plan with Claude under it are centred in the page together by
       * the layout around them, so what is left over is shared out above and
       * beneath them rather than piled under them.
       */}
      <div className="grid items-start gap-14 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <div className="flex flex-col gap-[26px] pt-[6px]">
          <Image
            src={lockup}
            alt="plan2go"
            width={300}
            height={111}
            preload
            className="h-auto w-[min(300px,80%)]"
          />

          <h1 className="font-display text-[clamp(28px,3.2vw,42px)] leading-[1.14] font-semibold tracking-[-0.01em] text-pretty text-ink">
            Plan it, map it, share it.
          </h1>

          <p className="max-w-[34ch] text-[17px] leading-[1.65] text-pretty text-ink-muted">
            Add your cities, fill each day with places, see real travel times, and share it as a
            link or PDF.
          </p>
        </div>

        <CreateTripForm />
      </div>

      <PlanWithClaude />
    </div>
  );
}
