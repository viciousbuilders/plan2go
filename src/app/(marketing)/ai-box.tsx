"use client";

import { useState } from "react";
import { ArrowRightIcon, SparkleIcon } from "@/ui/icons";
import type { AppId } from "./app-guides";
import { APP_GUIDES } from "./app-guides";
import { CopyBox } from "./copy-box";
import { SetUpDialog } from "./set-up-dialog";
import { useClientInAddress, useMcpAddress } from "./use-mcp-address";

/**
 * The other way to plan a trip: by asking an AI assistant, which reaches
 * plan2go through the MCP server every deployment serves. In the sage of the
 * page's second accent, so it reads as the way round rather than the way in.
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
    <div className="flex flex-col gap-3.5 rounded-[28px] bg-sage-100 px-[18px] pt-5 pb-4 sm:px-[22px] sm:pt-[22px] sm:pb-[18px]">
      <div className="flex items-center gap-2.5 text-sage-800">
        <SparkleIcon size={18} strokeWidth={2.75} className="flex-none" />
        <h2 className="text-[17px] leading-[1.2] font-bold">Or plan it with AI</h2>
      </div>
      <p className="text-[15px] leading-normal text-pretty text-ink/78">
        Paste this into your AI agent’s chat. It connects plan2go for you. Then ask it for your
        trip in your own words.
      </p>
      <CopyBox text={sentence} what="the sentence" kind="words" />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="text-[13px] leading-[1.4] font-medium text-ink/68">
          Works in agents that can change their own settings, like Claude Code, Codex, Cursor and
          VS Code.
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          className="flex h-9 items-center gap-1.5 rounded-pill px-3 text-[14px] leading-none font-bold text-sage-800 underline underline-offset-[3px] hover:bg-sage-200 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          Set it up manually
          <ArrowRightIcon size={14} strokeWidth={2.75} />
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
