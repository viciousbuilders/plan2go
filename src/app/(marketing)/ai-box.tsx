"use client";

import { useState } from "react";
import { ArrowRightIcon } from "@/ui/icons";
import type { AppId } from "./app-guides";
import { APP_GUIDES, AskForTrip } from "./app-guides";
import { CopyBox } from "./copy-box";
import { SetUpDialog } from "./set-up-dialog";
import { useClientInAddress, useMcpAddress } from "./use-mcp-address";

/**
 * The other way to plan a trip: by asking an AI assistant, which reaches
 * plan2go through the MCP server every deployment serves. Set plainly, in
 * small type with no card of its own, so it reads as the way round rather
 * than the way in.
 *
 * A sentence to paste into an agent that can change its own settings, which
 * then adds plan2go itself, and for any other app the steps by hand, in a
 * dialog over the page. The steps open on the app chosen last, kept in the
 * page's address as `?client=`, so the same link brings the reader back to
 * the same app's steps.
 */
export function AiBox() {
  const address = useMcpAddress();
  const inAddress = useClientInAddress();
  const [picked, setPicked] = useState<AppId | null>(null);
  const [open, setOpen] = useState(false);
  const app = picked ?? APP_GUIDES.find((one) => one.id === inAddress)?.id ?? "claude";
  const sentence = `Add the plan2go MCP server to your settings using this link: ${address}. Tell me when it's connected.`;

  const pick = (next: AppId): void => {
    setPicked(next);
    const url = new URL(window.location.href);
    url.searchParams.set("client", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* The heading and its line as one, closer to each other than to what
          follows. In the body face, as the page's other small headings are:
          the planner's own face is the site's default for a heading. */}
      <div className="flex flex-col gap-1.5">
        <h2 className="font-body text-[16px] leading-[1.2] font-bold text-ink">
          Or build it with AI
        </h2>
        <p className="text-[13px] leading-normal font-medium text-pretty text-ink-muted">
          Paste this into your AI agent’s chat.
        </p>
      </div>
      <CopyBox text={sentence} what="the sentence" kind="words" />
      {/* What to do next, as the dialog's steps end, and of the agent rather
          than an app by name: the box is for any of them. */}
      <AskForTrip called="your agent" compact />
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="flex items-center gap-1 self-start text-[13px] leading-normal font-bold text-terracotta-800 underline underline-offset-[3px] hover:text-terracotta-900 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      >
        Set it up manually
        <ArrowRightIcon size={14} strokeWidth={2.75} />
      </button>
      <SetUpDialog
        open={open}
        app={app}
        address={address}
        onPick={pick}
        onClose={() => {
          setOpen(false);
        }}
      />
    </div>
  );
}
