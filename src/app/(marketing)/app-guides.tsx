import type { ReactNode } from "react";
import { ArrowRightIcon, BookIcon, ChatIcon, InfoIcon } from "@/ui/icons";
import { CopyBox } from "./copy-box";

/** Every app the steps for connecting have a page for. */
export type AppId = "claude" | "chatgpt" | "other" | "claude-code" | "codex" | "cursor" | "vscode";

interface GuideProps {
  /** The deployment's MCP address, as it is copied. */
  readonly address: string;
}

export interface AppGuide {
  readonly id: AppId;
  /** The app's own name, as the list of apps says it. */
  readonly label: string;
  /** What the steps call the app: its name, or "your app" for the catch-all. */
  readonly called: string;
  /** Anything the app needs said first, its one-click link, and its steps. */
  readonly Guide: (props: GuideProps) => ReactNode;
  /** What is worth knowing once the steps are done, under them. */
  readonly notes: readonly string[];
  /**
   * The app maker's own page on adding a server, for when its screens have
   * moved on from these steps. Every app but the catch-all has one.
   */
  readonly help: { readonly name: string; readonly href: string } | null;
}

/** A name on the app's own screen, set off so the reader can look for it there. */
function Ui({ children }: { readonly children: ReactNode }) {
  return <b className="font-bold text-ink">{children}</b>;
}

/** A file's path, in the face and weight the code boxes are in. */
function Path({ children }: { readonly children: ReactNode }) {
  return <code className="font-mono text-[13px] font-medium">{children}</code>;
}

function StepList({ children }: { readonly children: ReactNode }) {
  return <ol className="flex flex-col gap-3">{children}</ol>;
}

/**
 * One step: its number, right aligned in a narrow column so the words of
 * every step start on one line, then the words and anything to copy under
 * them. Left without a number it is an aside, such as "Or add it yourself",
 * and runs the width of the list.
 */
function Step({ n, children }: { readonly n?: number; readonly children: ReactNode }) {
  return (
    <li className="flex gap-2 text-[16px] leading-normal text-ink">
      {n === undefined ? null : <span className="w-[18px] flex-none text-right">{n}.</span>}
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">{children}</div>
    </li>
  );
}

function Words({ children }: { readonly children: ReactNode }) {
  return <span className="text-pretty">{children}</span>;
}

/**
 * A link that opens the app on its own offer to add plan2go, in the
 * accent's lightest tint, with an arrow, as it goes somewhere.
 */
function AddTo({ app, href }: { readonly app: string; readonly href: string }) {
  return (
    <a
      href={href}
      className="flex h-[34px] items-center gap-1.5 self-start rounded-pill bg-terracotta-100 px-3.5 text-[14px] leading-none font-bold text-terracotta-800 hover:bg-terracotta-200 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      Add to {app}
      <ArrowRightIcon size={14} strokeWidth={2.75} />
    </a>
  );
}

/**
 * Claude, on the web or in the desktop app, which adds a server as a custom
 * connector, asks how to sign in to it, and has it turned on chat by chat.
 */
function ClaudeGuide({ address }: GuideProps) {
  return (
    <StepList>
      <Step n={1}>
        <Words>
          In Claude on the web or the desktop app, open <Ui>Customize</Ui>, then{" "}
          <Ui>Connectors</Ui>.
        </Words>
      </Step>
      <Step n={2}>
        <Words>
          Select <Ui>+ Add</Ui>, then <Ui>Add custom connector</Ui>, and name it plan2go.
        </Words>
      </Step>
      <Step n={3}>
        <Words>
          Paste this address and select <Ui>Continue</Ui>:
        </Words>
        <CopyBox text={address} what="the address" kind="code" />
      </Step>
      <Step n={4}>
        <Words>
          Under <Ui>Authentication</Ui>, choose <Ui>No sign in</Ui>, then select <Ui>Add</Ui>.
        </Words>
      </Step>
      <Step n={5}>
        <Words>
          In a chat, select <Ui>+</Ui>, then <Ui>Connectors</Ui>, and turn plan2go on.
        </Words>
      </Step>
    </StepList>
  );
}

/**
 * ChatGPT on the web, which adds a server as a custom MCP server, and lets
 * one make changes, as opening and planning a trip does, only on the plans
 * for workplaces and schools, once developer mode is on.
 */
function ChatGptGuide({ address }: GuideProps) {
  return (
    <>
      <p className="text-[16px] leading-normal text-pretty text-ink-muted">
        Planning a trip needs an app that can open and change trips, which ChatGPT allows on
        Business, Enterprise and Edu plans, once an admin turns on developer mode.
      </p>
      <StepList>
        <Step n={1}>
          <Words>
            In ChatGPT on the web, open <Ui>Plugins</Ui>, select <Ui>+</Ui>, then{" "}
            <Ui>Add custom MCP server</Ui>.
          </Words>
        </Step>
        <Step n={2}>
          <Words>Paste this address:</Words>
          <CopyBox text={address} what="the address" kind="code" />
        </Step>
        <Step n={3}>
          <Words>
            Under authentication, choose <Ui>No authentication</Ui>.
          </Words>
        </Step>
        <Step n={4}>
          <Words>
            Select <Ui>I understand and want to continue</Ui>, then <Ui>Create as a plugin</Ui>.
          </Words>
        </Step>
      </StepList>
    </>
  );
}

/**
 * Any other app that speaks MCP: the address, which most take, or, for an
 * app that only runs servers on the reader's own computer, a bridge to it.
 */
function OtherGuide({ address }: GuideProps) {
  return (
    <StepList>
      <Step n={1}>
        <Words>
          In your app, add a custom connector or MCP server in its settings, with this address:
        </Words>
        <CopyBox text={address} what="the address" kind="code" />
      </Step>
      <Step n={2}>
        <Words>If the app asks how to sign in, choose no authentication.</Words>
      </Step>
      <Step n={3}>
        <Words>
          If your app only runs MCP servers on your own computer, add plan2go with this command
          instead, which needs Node.js:
        </Words>
        <CopyBox text={`npx -y mcp-remote ${address}`} what="the command" kind="code" />
      </Step>
    </StepList>
  );
}

/** Claude Code, which adds a server with a command in a terminal. */
function ClaudeCodeGuide({ address }: GuideProps) {
  return (
    <StepList>
      <Step n={1}>
        <Words>In a terminal, run:</Words>
        <CopyBox
          text={`claude mcp add --transport http plan2go ${address}`}
          what="the Claude Code command"
          kind="code"
        />
      </Step>
      <Step n={2}>
        <Words>
          Start Claude Code and ask for a trip. Typing <Ui>/mcp</Ui> shows whether plan2go is
          connected.
        </Words>
      </Step>
    </StepList>
  );
}

/**
 * Codex, which adds a server with a command in a terminal, to a setup that
 * the ChatGPT desktop app and Codex in a code editor read as well.
 */
function CodexGuide({ address }: GuideProps) {
  return (
    <StepList>
      <Step n={1}>
        <Words>In a terminal, run:</Words>
        <CopyBox
          text={`codex mcp add plan2go --url ${address}`}
          what="the Codex command"
          kind="code"
        />
      </Step>
      <Step n={2}>
        <Words>Start Codex and ask for a trip.</Words>
      </Step>
    </StepList>
  );
}

/**
 * Cursor, which opens on its own offer to add a server from a link carrying
 * the server's settings, or takes them in its settings file. The link's
 * settings are the file's for one server, in base64 and then made safe for a
 * link, as Cursor reads them.
 */
function CursorGuide({ address }: GuideProps) {
  const settings = btoa(JSON.stringify({ url: address }));
  const link = `cursor://anysphere.cursor-deeplink/mcp/install?name=plan2go&config=${encodeURIComponent(settings)}`;
  const file = JSON.stringify({ mcpServers: { plan2go: { url: address } } }, null, 2);
  return (
    <>
      <AddTo app="Cursor" href={link} />
      <StepList>
        <Step>
          <Words>
            Or add it yourself, in <Path>~/.cursor/mcp.json</Path>:
          </Words>
          <CopyBox text={file} what="the Cursor settings" kind="code" />
        </Step>
      </StepList>
    </>
  );
}

/**
 * VS Code, which opens on its own offer to add a server from a link carrying
 * its name and settings, or adds one from the Command Palette.
 */
function VsCodeGuide({ address }: GuideProps) {
  const settings = JSON.stringify({ name: "plan2go", type: "http", url: address });
  const link = `vscode:mcp/install?${encodeURIComponent(settings)}`;
  return (
    <>
      <AddTo app="VS Code" href={link} />
      <StepList>
        <Step>
          <Words>Or add it yourself:</Words>
        </Step>
        <Step n={1}>
          <Words>
            Open the Command Palette and run <Ui>MCP: Add Server</Ui>.
          </Words>
        </Step>
        <Step n={2}>
          <Words>
            Choose <Ui>HTTP</Ui> and paste this address:
          </Words>
          <CopyBox text={address} what="the address" kind="code" />
        </Step>
        <Step n={3}>
          <Words>
            Name it plan2go, then choose <Ui>Global</Ui>, and <Ui>Copilot Global</Ui> if it asks.
          </Words>
        </Step>
      </StepList>
    </>
  );
}

const ASIDE = "flex items-start gap-2 text-[13px] leading-normal font-medium text-ink-muted";

/**
 * The one thing every way of connecting comes to once it is done: asking
 * for the trip, of whatever was connected, by the name the reader knows it
 * by. One sentence for the dialog's steps and for the AI box beside the form,
 * which shows it smaller, so the two say it alike.
 */
export function AskForTrip({
  called,
  compact = false,
}: {
  readonly called: string;
  readonly compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center rounded-[20px] bg-sage-100 px-4 text-sage-900 ${
        compact ? "gap-2.5 py-3" : "gap-3 py-3.5"
      }`}
    >
      <span
        className={`grid flex-none place-items-center rounded-pill bg-sage text-sheet ${compact ? "size-6" : "size-8"}`}
      >
        <ChatIcon size={compact ? 14 : 18} strokeWidth={2.75} />
      </span>
      <span
        className={`leading-normal font-semibold text-pretty ${compact ? "text-[13px]" : "text-[16px]"}`}
      >
        Once it’s connected, ask {called} in your own words to create the trip for you.
      </span>
    </div>
  );
}

/**
 * One app's way of connecting, as the steps show it: its own steps, then the
 * one thing every app comes to once they are done, asking for the trip, then
 * whatever is worth knowing and where its maker keeps the latest steps.
 */
export function AppSteps({ guide, address }: { readonly guide: AppGuide; readonly address: string }) {
  const { Guide, called, notes, help } = guide;
  return (
    <div className="flex flex-col gap-4">
      <Guide address={address} />
      <AskForTrip called={called} />
      {notes.length === 0 && help === null ? null : (
        <div className="flex flex-col gap-2 px-1 pt-0.5">
          {notes.map((note) => (
            <p key={note} className={ASIDE}>
              <InfoIcon size={15} strokeWidth={2.75} className="mt-0.5 flex-none" />
              <span>{note}</span>
            </p>
          ))}
          {help === null ? null : (
            <p className={ASIDE}>
              <BookIcon size={15} strokeWidth={2.75} className="mt-0.5 flex-none" />
              <span>
                Screen looks different?{" "}
                <a
                  href={help.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-terracotta-800 underline hover:text-terracotta-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                >
                  {help.name}
                </a>{" "}
                has the latest steps.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The apps in their two groups, as the list beside the steps stands: the
 * chat apps most people meet an assistant in, Claude first since every plan
 * there can add plan2go, with the catch-all for every other app after them,
 * then the coding tools.
 */
export const APP_GROUPS: readonly { readonly name: string; readonly apps: readonly AppGuide[] }[] = [
  {
    name: "Chat apps",
    apps: [
      {
        id: "claude",
        label: "Claude",
        called: "Claude",
        Guide: ClaudeGuide,
        notes: ["On the Free plan, Claude allows one custom connector."],
        help: {
          name: "Claude's guide",
          href: "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
        },
      },
      {
        id: "chatgpt",
        label: "ChatGPT",
        called: "ChatGPT",
        Guide: ChatGptGuide,
        notes: [],
        help: {
          name: "OpenAI's guide",
          href: "https://developers.openai.com/plugins/deploy/connect-chatgpt",
        },
      },
      { id: "other", label: "Other apps", called: "your app", Guide: OtherGuide, notes: [], help: null },
    ],
  },
  {
    name: "Code tools",
    apps: [
      {
        id: "claude-code",
        label: "Claude Code",
        called: "Claude Code",
        Guide: ClaudeCodeGuide,
        notes: [],
        help: { name: "the Claude Code guide", href: "https://code.claude.com/docs/en/mcp" },
      },
      {
        id: "codex",
        label: "Codex",
        called: "Codex",
        Guide: CodexGuide,
        notes: ["The ChatGPT desktop app and Codex in your code editor share this setup."],
        help: { name: "the Codex guide", href: "https://developers.openai.com/codex/mcp" },
      },
      {
        id: "cursor",
        label: "Cursor",
        called: "Cursor",
        Guide: CursorGuide,
        notes: [],
        help: { name: "the Cursor guide", href: "https://cursor.com/docs/mcp" },
      },
      {
        id: "vscode",
        label: "VS Code",
        called: "VS Code",
        Guide: VsCodeGuide,
        notes: [],
        help: {
          name: "the VS Code guide",
          href: "https://code.visualstudio.com/docs/agent-customization/mcp-servers",
        },
      },
    ],
  },
];

/** Every app, in the order the list stands. */
export const APP_GUIDES: readonly AppGuide[] = APP_GROUPS.flatMap((group) => group.apps);
