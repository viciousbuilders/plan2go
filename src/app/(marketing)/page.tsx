import Image from "next/image";
// Imported rather than served from public/, so Next sizes and hashes it.
import lockup from "../../../logo/logo-text.png";
import { AiBox } from "./ai-box";
import { CreateTripForm } from "./create-trip-form";
import { DayPreview } from "./day-preview";
import { headlineFont } from "./headline-font";

/** How far in from the window's edges the words on the page's own ground sit, as v5 has them. */
const ACROSS = "px-[clamp(24px,5vw,60px)]";

/** And how far down from the top of their column and up from its foot. */
const DOWN = "pt-[clamp(32px,5vw,56px)] pb-[clamp(32px,5vw,56px)]";

/**
 * Built once and served as it is, from the edge nearest the reader, rather
 * than drawn afresh on every visit. Nothing on it depends on who is asking:
 * today, which the form opens on, is read from the reader's own clock in the
 * browser, the address an AI app is given from the browser's own, and the
 * zone a trip keeps is decided when it is opened.
 */
export default function MarketingPage() {
  return (
    // Drawn to "plan2go First Page v5": two panels the height of the window.
    // On the left, on the page's own ground, what the product is, a day as
    // the planner shows one, and at the foot the way to plan it with AI. On
    // the right, a panel a step darker with the form in its middle. They
    // share the width as v5's do, 380 and 480 to start with and what is over
    // that two parts to three, which is also where they stop fitting side by
    // side. Under 860px, one column: the words, the form in its panel, then
    // the way with AI, as the phone has had them, and not the day, which
    // would push the form down out of reach of a thumb.
    <section className="grid grow grid-cols-[minmax(0,1fr)] [grid-template-areas:'hero'_'form'_'ai'] min-[860px]:grid-cols-[minmax(0,calc((100%_-_860px)_*_0.4_+_380px))_minmax(0,1fr)] min-[860px]:grid-rows-[auto_auto_1fr] min-[860px]:gap-y-12 min-[860px]:[grid-template-areas:'hero_form'_'card_form'_'ai_form']">
      <div className={`flex flex-col gap-12 ${ACROSS} ${DOWN} [grid-area:hero] min-[860px]:pb-0`}>
        {/* Out to the left by the clear margin the picture has round its
            drawing, so the mascot's hand lines up with the words under it. */}
        <Image
          src={lockup}
          alt="plan2go"
          width={140}
          height={52}
          preload
          className="-ml-[5px] h-auto w-[140px] max-w-full"
        />

        <div className="flex max-w-[440px] flex-col gap-5">
          {/* Each "it" held to the word before it, so a line breaks between
              the three and never inside one, as the canvas reads: "Plan it,
              map it," and then "share it.". Balanced lines split "map it". */}
          <h1
            className={`${headlineFont.className} text-[clamp(40px,4vw,54px)] leading-[1.08] text-ink`}
          >
            {"Plan it, map it, share it."}
          </h1>

          <p className="text-[17px] leading-[1.6] text-pretty text-ink/66">
            Add your cities, fill each day with places, see real travel times, and share it as a
            link or PDF.
          </p>
        </div>
      </div>

      <div className={`hidden ${ACROSS} [grid-area:card] min-[860px]:block`}>
        <DayPreview />
      </div>

      {/* Down at the foot of its column on a desk, however tall the form's
          panel beside it is. */}
      <div className={`${ACROSS} ${DOWN} [grid-area:ai] min-[860px]:self-end min-[860px]:pt-0`}>
        <div className="max-w-[440px]">
          <AiBox />
        </div>
      </div>

      {/* Its foot kept clear on a desk, where the credit sits in its corner. */}
      <div className="flex min-w-0 items-center justify-center bg-neutral-200 px-[clamp(20px,5vw,60px)] py-[clamp(40px,5vw,60px)] [grid-area:form] min-[860px]:pb-20">
        <CreateTripForm />
      </div>
    </section>
  );
}
