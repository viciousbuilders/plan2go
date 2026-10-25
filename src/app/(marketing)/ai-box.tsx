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
      <h2 className="text-[15px] leading-[1.3] font-bold text-ink">Or build it with AI</h2>
      <p className="text-[14px] leading-[1.55] text-pretty text-ink/66">
        Paste this into your AI agent’s chat.
      </p>
      <CopyBox text={sentence} what="the sentence" kind="words" />
      {/* What to do next, as the dialog's steps end, and of the agent rather
          than an app by name: the box is for any of them. */}
      <AskForTrip called="your agent" compact />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-normal font-medium text-ink/66">
        <span>Works with Claude Code, Cursor, Codex.</span>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          className="flex items-center gap-1 font-bold text-terracotta-800 underline underline-offset-[3px] hover:text-terracotta-900 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          Set it up manually
          <ArrowRightIcon size={13} strokeWidth={2.75} />
        </button>
      </div>
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
