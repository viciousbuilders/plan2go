import Image from "next/image";
// Imported rather than served from public/, so Next sizes and hashes it.
import lockup from "../../../logo/logo-text.png";
import { AiBox } from "./ai-box";
import { CreateTripForm } from "./create-trip-form";
import { headlineFont } from "./headline-font";

/**
 * Built once and served as it is, from the edge nearest the reader, rather
 * than drawn afresh on every visit. Nothing on it depends on who is asking:
 * today, which the form opens on, is read from the reader's own clock in the
 * browser, the address an AI app is given from the browser's own, and the
 * zone a trip keeps is decided when it is opened.
 */
export default function MarketingPage() {
  return (
    // Drawn to "plan2go First Page v3" and its mobile canvas. On a desk, what
    // the product is in the left column with the way to plan it with AI under
    // it, and the form that starts a trip in the right, centred against the
    // two of them. Below the width where two columns of 440px and the gap
    // between them fit, one column, the form straight after the words and
    // the way with AI after the form, as the phone has them.
    <section className="grid gap-6 [grid-template-areas:'hero'_'form'_'ai'] min-[1000px]:grid-cols-2 min-[1000px]:items-center min-[1000px]:gap-x-14 min-[1000px]:gap-y-7 min-[1000px]:[grid-template-areas:'hero_form'_'ai_form']">
      <div className="flex max-w-[520px] flex-col gap-4 [grid-area:hero] sm:gap-7">
        {/* Out to the left by the clear margin the picture has round its
            drawing, so the mascot's hand lines up with the words under it. */}
        <Image
          src={lockup}
          alt="plan2go"
          width={280}
          height={103}
          preload
          className="-ml-1.5 h-auto w-[168px] max-w-full sm:-ml-2 sm:w-[280px]"
        />

        <h1
          className={`${headlineFont.className} text-[38px] leading-[1.05] text-balance text-ink sm:text-[clamp(40px,5vw,60px)]`}
        >
          Plan it, map it, share it.
        </h1>

        <p className="text-[17px] leading-normal text-pretty text-ink/75 sm:text-[19px] sm:leading-[1.55]">
          Add your cities, fill each day with places, see real travel times, and share it as a
          link or PDF.
        </p>
      </div>

      <div className="[grid-area:form]">
        <CreateTripForm />
      </div>

      <div className="max-w-[520px] [grid-area:ai]">
        <AiBox />
      </div>
    </section>
  );
}
