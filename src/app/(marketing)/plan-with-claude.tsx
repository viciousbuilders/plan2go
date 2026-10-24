import type { ReactNode } from "react";
import { ConnectPlan2go } from "./connect-plan2go";
import { FIELD_HINT } from "./field-styles";
import { headlineFont } from "./headline-font";

/**
 * A trip asked for the way a person would ask: where and for how long, who
 * is going, how full the days should be, and the link to send the others.
 */
const EXAMPLE_PROMPT =
  "Use plan2go to plan five days in Tokyo next month for a family with two kids. Put three or four places on each day, keep the travel between them short, and give me the read only link to share.";

interface StepProps {
  readonly number: number;
  readonly title: string;
  readonly children: ReactNode;
}

/**
 * One of the two steps, as a card a step lighter than the page: its number on
 * a sage disc, in the headline's face, its name, and what it asks. The
 * number is the list's to say, so a screen reader hears it once.
 */
function Step({ number, title, children }: StepProps) {
  return (
    <li className="flex flex-col gap-4 rounded-card bg-paper-raised p-6 md:p-8">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`${headlineFont.className} grid size-8 shrink-0 place-items-center rounded-full bg-sage text-[16px] leading-none text-paper-raised`}
        >
          {number}
        </span>
        <h3 className="font-body text-[16px] leading-6 font-bold text-ink">{title}</h3>
      </div>
      {children}
    </li>
  );
}

/**
 * The other way to plan a trip: by asking Claude, which reaches plan2go
 * through the MCP server every deployment serves. Under the hero rather than
 * in it, which keeps to its headline, its one sentence and its form.
 *
 * The heading with its one line beside it, and under them the two steps,
 * connecting and then asking, in the same two columns as the hero and
 * stacking where they do, each card as tall as the taller.
 *
 * Drawn on the server. Only the connecting step's tabs and its copying need
 * the browser, so only they are sent to it.
 */
export function PlanWithClaude() {
  return (
    <section aria-labelledby="plan-with-claude" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <h2
          id="plan-with-claude"
          className={`${headlineFont.className} text-[clamp(28px,2.5vw,32px)] leading-[1.15] text-ink`}
        >
          Plan it with Claude
        </h2>
        <p className="text-[16px] leading-6 text-pretty text-ink-muted">
          Ask for a trip in your own words. Claude fills the days and checks every travel time.
        </p>
      </div>

      <ol className="grid items-stretch gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <Step number={1} title="Connect plan2go">
          <ConnectPlan2go />
        </Step>

        <Step number={2} title="Ask for a trip">
          <p className={FIELD_HINT}>Then try something like:</p>
          <p className="rounded-chip bg-paper p-4 text-[14px] leading-5.5 text-pretty text-ink">
            {EXAMPLE_PROMPT}
          </p>
        </Step>
      </ol>
    </section>
  );
}
