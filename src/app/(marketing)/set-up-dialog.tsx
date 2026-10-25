"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "@/ui/icons";
import type { AppId } from "./app-guides";
import { APP_GROUPS, APP_GUIDES, AppSteps } from "./app-guides";
import { FIELD_LABEL } from "./field-styles";
import { headlineFont } from "./headline-font";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta";

interface SetUpDialogProps {
  /** Whether the dialog is up over the page. */
  readonly open: boolean;
  /** The app whose steps are shown. */
  readonly app: AppId;
  /** The deployment's MCP address, which the steps give to copy. */
  readonly address: string;
  readonly onPick: (app: AppId) => void;
  readonly onClose: () => void;
}

/**
 * The steps for connecting plan2go by hand, app by app, in the browser's own
 * modal dialog, which keeps the keyboard inside it, puts the page behind out
 * of reach, closes on Escape, and gives the focus back to the button that
 * opened it. A press on the dimmed page around it closes it too.
 *
 * On a desk, a card over the page, dimmed and blurred, with the apps listed
 * down its side in their two groups. On a phone, a sheet up from the foot of
 * the window, the apps in one row that scrolls sideways and the steps under
 * them scrolling on their own.
 *
 * Every app's steps are drawn in the one place and all but the chosen one
 * hidden, so the card is as tall as the longest of them and keeps its height
 * as the reader moves between apps.
 */
export function SetUpDialog({ open, app, address, onPick, onClose }: SetUpDialogProps) {
  const dialog = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const box = dialog.current;
    if (box === null) {
      return;
    }
    if (open && !box.open) {
      box.showModal();
    } else if (!open && box.open) {
      box.close();
    }
  }, [open]);

  const called = APP_GUIDES.find((one) => one.id === app)?.called ?? "your app";

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // The dialog itself is only ever the target of a press on the page
        // dimmed around it: everything inside is drawn by the box it holds.
        if (event.target === event.currentTarget) {
          dialog.current?.close();
        }
      }}
      className="m-auto h-fit max-h-[calc(100dvh-48px)] w-[calc(100%-48px)] max-w-[1120px] flex-col overflow-hidden rounded-[32px] bg-paper p-0 text-ink shadow-lg backdrop:bg-ink/22 backdrop:backdrop-blur-[10px] open:flex max-sm:mx-0 max-sm:mt-auto max-sm:mb-0 max-sm:max-h-[92dvh] max-sm:w-full max-sm:max-w-full max-sm:rounded-b-none max-sm:rounded-t-[28px]"
    >
      <div className="relative flex min-h-0 flex-1 flex-col gap-6 p-[clamp(24px,4vw,44px)] max-sm:gap-4 max-sm:px-4 max-sm:pt-2 max-sm:pb-[max(34px,env(safe-area-inset-bottom))]">
        {/* The sheet's handle, which says it came up from the foot of the window. */}
        <div
          aria-hidden="true"
          className="h-[5px] w-9 flex-none self-center rounded-pill bg-neutral-300 sm:hidden"
        />
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            dialog.current?.close();
          }}
          className={`absolute top-5 right-5 grid size-10 place-items-center rounded-pill bg-paper-raised text-ink hover:bg-terracotta-100 ${FOCUS} max-sm:top-[18px] max-sm:right-3 max-sm:size-11`}
        >
          <CloseIcon size={18} strokeWidth={2.75} />
        </button>

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 pr-12 max-sm:flex-col max-sm:items-start max-sm:gap-1.5 max-sm:pt-1 max-sm:pr-[52px] max-sm:pl-1">
          <h2
            id={titleId}
            className={`${headlineFont.className} text-[32px] leading-[1.1] max-sm:text-[26px]`}
          >
            Set it up manually
          </h2>
          <p className="text-[16px] leading-normal text-ink-muted">
            Pick your AI app and follow its steps to connect plan2go.
          </p>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[28px] bg-sheet shadow-[0_0_0_2px_var(--color-neutral-200)] max-sm:flex max-sm:flex-col">
          <nav
            aria-label="Your AI app"
            className="scroll-quiet flex min-w-[190px] flex-col gap-[18px] overflow-auto bg-neutral-200 px-3.5 py-6 max-sm:min-w-0 max-sm:flex-none max-sm:flex-row max-sm:gap-1.5 max-sm:overflow-x-auto max-sm:p-2.5 max-sm:[scrollbar-width:none]"
          >
            {APP_GROUPS.map((group, index) => {
              const groupId = `${titleId}-group-${String(index)}`;
              return (
                <div
                  key={group.name}
                  role="group"
                  aria-labelledby={groupId}
                  className="flex flex-col gap-1 max-sm:flex-none max-sm:flex-row max-sm:gap-1.5"
                >
                  {/* Named on a desk, where the list stands in its two
                      groups; on a phone's one row the names would only be
                      in the way, so only a screen reader hears them. Drawn
                      as the form's labels are, in small capitals. */}
                  <span id={groupId} className={`${FIELD_LABEL} px-3.5 pb-1.5 max-sm:sr-only`}>
                    {group.name}
                  </span>
                  {group.apps.map((one) => {
                    const chosen = one.id === app;
                    return (
                      <button
                        key={one.id}
                        type="button"
                        aria-pressed={chosen}
                        onClick={() => {
                          onPick(one.id);
                        }}
                        className={`flex h-10 items-center rounded-pill px-3.5 text-left text-[14px] leading-none font-bold ${FOCUS} max-sm:h-11 max-sm:flex-none max-sm:px-4 max-sm:whitespace-nowrap ${
                          chosen ? "bg-sheet text-ink shadow-sm" : "text-ink-muted hover:bg-terracotta-100"
                        }`}
                      >
                        {one.label}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="scroll-quiet flex min-h-0 min-w-0 flex-col gap-[18px] overflow-auto p-7 max-sm:flex-1 max-sm:gap-4 max-sm:px-3.5 max-sm:py-[18px]">
            <h3 className="font-body text-[18px] leading-[1.2] font-bold">Connect plan2go to {called}</h3>
            <div className="grid">
              {APP_GUIDES.map((one) => (
                <div
                  key={one.id}
                  inert={one.id !== app}
                  className={`min-w-0 [grid-area:1/1] ${one.id === app ? "" : "invisible"}`}
                >
                  <AppSteps guide={one} address={address} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
