import Image from "next/image";
// Imported rather than served from public/, so Next sizes and hashes it.
import lockup from "../../../logo/logo-text.png";
import { StartTicket } from "./start-ticket";

/**
 * Built once and served as it is, from the edge nearest the reader, rather
 * than drawn afresh on every visit. Nothing on it depends on who is asking:
 * today, which the trip departs on until another day is chosen, is read from
 * the reader's own clock in the browser, and the zone a trip keeps is decided
 * when it is opened.
 */
export default function MarketingPage() {
  return (
    /*
     * The start page's design: the lockup, and under it what the product does,
     * in a line and a sentence, over the ticket that starts a trip. On a desk
     * they are centred in the page, one over the other; on a phone they are
     * written down its left edge, the way the page is read there.
     */
    <main className="mx-auto flex w-full max-w-[560px] grow flex-col md:max-w-[1040px] md:items-center md:justify-center md:gap-10 md:pt-8 md:pb-14">
      <div className="flex flex-col gap-8 pt-14 pb-7 md:items-center md:gap-6 md:p-0">
        <Image
          src={lockup}
          alt="plan2go"
          sizes="140px"
          preload
          className="h-auto w-[112px] md:w-[140px]"
        />
        <div className="flex flex-col gap-3 md:items-center md:gap-4 md:text-center">
          <h1 className="font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.01em] text-balance text-ink md:text-[clamp(34px,5.2vw,53px)] md:leading-[1.08]">
            Plan it, sort it, share it.
          </h1>
          <p className="text-[15.5px] leading-[1.55] text-pretty text-ink-muted md:max-w-[44ch] md:text-[17px] md:leading-[1.6]">
            Add each stop and how long you stay. We turn it into a{" "}
            <span className="whitespace-nowrap">day-by-day</span> plan you can fill with places.
          </p>
        </div>
      </div>

      <StartTicket />
    </main>
  );
}
