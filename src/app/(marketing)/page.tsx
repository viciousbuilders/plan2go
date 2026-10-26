import Image from "next/image";
// Imported rather than served from public/, so Next sizes and hashes it.
import lockup from "../../../logo/logo-text.png";
import { AiBox } from "./ai-box";
import { CreateTripForm } from "./create-trip-form";
import { DayPreview } from "./day-preview";
import { headlineFont } from "./headline-font";

/**
 * The frame every block keeps to, from first-page.css, which the layout's
 * shell carries: in from the window's sides, and down from the top of a
 * column or up from its foot. Each side said once per block, so no two rules
 * for one side are left for the stylesheet's order to settle.
 */
const ACROSS = "px-[var(--across)]";
const TOP = "pt-[var(--room)]";
const FOOT = "pb-[var(--room)]";

/**
 * How far the words on the left run at most: the headline on its one line,
 * the sentence under it and the way with AI all out to one edge, the
 * sentence about 65 characters to a line.
 */
const MEASURE = "max-w-[560px]";

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
    // side. The day takes the height the others leave it, in the middle of
    // it. Under 860px, one column: the words, the form in its panel, then the
    // way with AI, as the phone has had them, and not the day, which would
    // push the form down out of reach of a thumb.
    <section className="first-page-grid relative grid grow grid-cols-[minmax(0,1fr)] [grid-template-areas:'hero'_'form'_'ai'] min-[860px]:grid-cols-[minmax(0,calc((100%_-_860px)_*_0.4_+_380px))_minmax(0,1fr)] min-[860px]:grid-rows-[auto_minmax(0,1fr)_auto] min-[860px]:gap-y-[var(--step)] min-[860px]:[grid-template-areas:'hero_form'_'day_form'_'ai_form']">
      <div
        className={`flex flex-col gap-[var(--room)] ${ACROSS} ${TOP} pb-[var(--room)] [grid-area:hero] min-[860px]:pb-0`}
      >
        {/* In the frame's top right corner, as the credit is in its bottom
            right: over the form's panel on a desk, level with the headline,
            and over the words on a phone. */}
        <Image
          src={lockup}
          alt="plan2go"
          width={140}
          height={52}
          preload
          className="h-auto w-[140px] max-w-full self-end min-[860px]:absolute min-[860px]:top-[var(--room)] min-[860px]:right-[var(--across)] min-[860px]:w-[var(--lockup)]"
        />

        {/* Sized by the width it is given, so the headline can fill it. */}
        <div
          className={`@container flex ${MEASURE} flex-col gap-5 min-[860px]:gap-[var(--under-headline)]`}
        >
          {/* On one line on a desk, as large as the measure lets it be: one
              line of it is 11.48 times as wide as its type is large, and 8.6
              of every hundred of the measure keeps a little over, which at
              the measure's 560px is 48. Under 36px it takes two lines
              instead, at 36. Each "it" is held to the word before it, so a
              line breaks between the three and never inside one, as the
              canvas reads: "Plan it, map it," and then "share it.". On a
              phone, two lines at v5's 40. */}
          <h1
            className={`${headlineFont.className} text-[40px] leading-[1.08] text-ink min-[860px]:text-[length:clamp(36px,8.6cqw,48px)]`}
          >
            {"Plan it, map it, share it."}
          </h1>

          <p className="text-[18px] leading-[1.6] text-pretty text-ink-muted">
            Add your cities, fill each day with places, see real travel times, and share it as a
            link or PDF.
          </p>
        </div>
      </div>

      <div className={`first-page-day hidden ${ACROSS} [grid-area:day] min-[860px]:block`}>
        <DayPreview />
      </div>

      <div className={`${ACROSS} ${TOP} ${FOOT} [grid-area:ai] min-[860px]:pt-0`}>
        <div className={MEASURE}>
          <AiBox />
        </div>
      </div>

      {/* In from the sides as the words are. Its top and foot kept clear on a
          desk, where the lockup and the credit sit in its corners, so the
          form never runs up under either. */}
      <div
        className={`flex min-w-0 items-center justify-center bg-neutral-200 ${ACROSS} py-[var(--room)] [grid-area:form] min-[860px]:py-20`}
      >
        <CreateTripForm />
      </div>
    </section>
  );
}
