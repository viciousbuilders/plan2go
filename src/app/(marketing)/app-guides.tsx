import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/ui/icons";
import { CopyBox } from "./copy-box";
import { FIELD_HINT } from "./field-styles";

/** Every app the connecting step has a tab for. */
export type AppId = "claude" | "chatgpt" | "claude-code" | "codex" | "cursor" | "vscode" | "other";

interface GuideProps {
  /** The deployment's MCP address, as it is copied. */
  readonly address: string;
  /** The same address as it is shown, free to wrap before its path. */
  readonly shownAddress: ReactNode;
}

interface AppGuide {
  readonly id: AppId;
  /** The app's own name, as its tab says it. */
  readonly label: string;
  /** How that app adds plan2go, step by step, in the words on its own screens. */
  readonly Guide: (props: GuideProps) => ReactNode;
  /**
   * The app maker's own page on adding a server, for when its screens have
   * moved on from these steps. Every app but the catch-all has one.
   */
  readonly help: { readonly name: string; readonly href: string } | null;
}

/** A name on the app's own screen, set off so the reader can look for it there. */
function Ui({ children }: { readonly children: ReactNode }) {
  return <b className="font-semibold text-ink">{children}</b>;
}

/** A file's path, in the face the code is in. */
function Path({ children }: { readonly children: ReactNode }) {
  return <code className="font-mono text-[13px] text-ink">{children}</code>;
}

/** The steps, numbered, in the size and colour of a hint, the numbers a step quieter. */
function Steps({ children }: { readonly children: ReactNode }) {
  return (
    <ol
      className={`${FIELD_HINT} flex list-decimal flex-col gap-3 pl-5 marker:font-semibold marker:text-ink-faint`}
    >
      {children}
    </ol>
  );
}

/** What a step says to copy, under its words. */
function ToCopy({ children }: { readonly children: ReactNode }) {
  return <div className="mt-3">{children}</div>;
}

/**
 * A link that opens the app on its own offer to add plan2go, in the colours
 * and the size of the Copy button, with an arrow, as it goes somewhere.
 */
function AddTo({ app, href }: { readonly app: string; readonly href: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-7 items-center gap-1.5 self-start rounded-pill bg-terracotta-100 px-3 text-[13px] leading-none font-bold text-terracotta-800 hover:bg-terracotta-200 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      Add to {app}
      <ArrowRightIcon size={12} strokeWidth={3} />
    </a>
  );
}

/**
 * Claude, on the web or in the desktop app, which adds a server as a custom
 * connector, asks how to sign in to it, and has it turned on chat by chat.
 */
function ClaudeGuide({ address, shownAddress }: GuideProps) {
  return (
    <>
      <Steps>
        <li>
          In Claude on the web or the desktop app, open <Ui>Customize</Ui>, then{" "}
          <Ui>Connectors</Ui>.
        </li>
        <li>
          Select <Ui>+ Add</Ui>, then <Ui>Add custom connector</Ui>, and name it plan2go.
        </li>
        <li>
          Paste this address and select <Ui>Continue</Ui>:
          <ToCopy>
            <CopyBox text={address} shown={shownAddress} what="the address" />
          </ToCopy>
        </li>
        <li>
          Under <Ui>Authentication</Ui>, choose <Ui>No sign in</Ui>, then select <Ui>Add</Ui>.
        </li>
        <li>
          In a chat, select <Ui>+</Ui>, then <Ui>Connectors</Ui>, and turn plan2go on.
        </li>
      </Steps>
      <p className={FIELD_HINT}>On the Free plan, Claude allows one custom connector.</p>
    </>
  );
}

/**
 * ChatGPT on the web, which adds a server as a custom MCP server, and lets
 * one make changes, as opening and planning a trip does, only on the plans
 * for workplaces and schools, once developer mode is on.
 */
function ChatGptGuide({ address, shownAddress }: GuideProps) {
  return (
    <>
      <p className={FIELD_HINT}>
        Planning a trip needs an app that can open and change trips, which ChatGPT allows on
        Business, Enterprise and Edu plans, once an admin turns on developer mode.
      </p>
      <Steps>
        <li>
          In ChatGPT on the web, open <Ui>Plugins</Ui>, select <Ui>+</Ui>, then{" "}
          <Ui>Add custom MCP server</Ui>.
        </li>
        <li>
          Paste this address:
          <ToCopy>
            <CopyBox text={address} shown={shownAddress} what="the address" />
          </ToCopy>
        </li>
        <li>
          Under authentication, choose <Ui>No authentication</Ui>.
        </li>
        <li>
          Select <Ui>I understand and want to continue</Ui>, then <Ui>Create as a plugin</Ui>.
        </li>
      </Steps>
    </>
  );
}

/** Claude Code, which adds a server with a command in a terminal. */
function ClaudeCodeGuide({ address, shownAddress }: GuideProps) {
  return (
    <Steps>
      <li>
        In a terminal, run:
        <ToCopy>
          {/* The flag kept whole: the page wraps its lines prettily, moving
              words down to lengthen the last one, and took the flag apart at
              its hyphens to do it. */}
          <CopyBox
            text={`claude mcp add --transport http plan2go ${address}`}
            shown={
              <>
                claude mcp add <span className="whitespace-nowrap">--transport</span> http
                plan2go {shownAddress}
              </>
            }
            what="the Claude Code command"
          />
        </ToCopy>
      </li>
      <li>
        Start Claude Code and ask for a trip. Typing <Ui>/mcp</Ui> shows whether plan2go is
        connected.
      </li>
    </Steps>
  );
}

/**
 * Codex, which adds a server with a command in a terminal, to a setup that
 * the ChatGPT desktop app and Codex in a code editor read as well.
 */
function CodexGuide({ address, shownAddress }: GuideProps) {
  return (
    <>
      <Steps>
        <li>
          In a terminal, run:
          <ToCopy>
            <CopyBox
              text={`codex mcp add plan2go --url ${address}`}
              shown={
                <>
                  codex mcp add plan2go <span className="whitespace-nowrap">--url</span>{" "}
                  {shownAddress}
                </>
              }
              what="the Codex command"
            />
          </ToCopy>
        </li>
        <li>Start Codex and ask for a trip.</li>
      </Steps>
      <p className={FIELD_HINT}>
        The ChatGPT desktop app and Codex in your code editor share this setup.
      </p>
    </>
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
      <p className={FIELD_HINT}>
        Or add it yourself, in <Path>~/.cursor/mcp.json</Path>:
      </p>
      <CopyBox text={file} what="the Cursor settings" lines />
    </>
  );
}

/**
 * VS Code, which opens on its own offer to add a server from a link carrying
 * its name and settings, or adds one from the Command Palette.
 */
function VsCodeGuide({ address, shownAddress }: GuideProps) {
  const settings = JSON.stringify({ name: "plan2go", type: "http", url: address });
  const link = `vscode:mcp/install?${encodeURIComponent(settings)}`;
  return (
    <>
      <AddTo app="VS Code" href={link} />
      <p className={FIELD_HINT}>Or add it yourself:</p>
      <Steps>
        <li>
          Open the Command Palette and run <Ui>MCP: Add Server</Ui>.
        </li>
        <li>
          Choose <Ui>HTTP</Ui> and paste this address:
          <ToCopy>
            <CopyBox text={address} shown={shownAddress} what="the address" />
          </ToCopy>
        </li>
        <li>
          Name it plan2go, then choose <Ui>Global</Ui>, and <Ui>Copilot Global</Ui> if it asks.
        </li>
      </Steps>
    </>
  );
}

/**
 * Any other app that speaks MCP: the address, which most take, or, for an
 * app that only runs servers on the reader's own computer, a bridge to it.
 */
function OtherGuide({ address, shownAddress }: GuideProps) {
  return (
    <Steps>
      <li>
        In your app, add a custom connector or MCP server in its settings, with this address:
        <ToCopy>
          <CopyBox text={address} shown={shownAddress} what="the address" />
        </ToCopy>
      </li>
      <li>If the app asks how to sign in, choose no authentication.</li>
      <li>
        If your app only runs MCP servers on your own computer, add plan2go with this command
        instead, which needs Node.js:
        <ToCopy>
          {/* The command kept on one line ahead of the address: the page wraps
              its lines prettily, moving words down to lengthen the last one,
              and takes words apart at their hyphens to do it. */}
          <CopyBox
            text={`npx -y mcp-remote ${address}`}
            shown={
              <>
                <span className="whitespace-nowrap">npx -y mcp-remote</span> {shownAddress}
              </>
            }
            what="the command"
          />
        </ToCopy>
      </li>
    </Steps>
  );
}

/**
 * The apps in the order their tabs stand: the two chat apps most people meet
 * an assistant in, Claude first since every plan there can add plan2go, then
 * the coding tools, then every other app.
 */
export const APP_GUIDES: readonly AppGuide[] = [
  {
    id: "claude",
    label: "Claude",
    Guide: ClaudeGuide,
    help: {
      name: "Claude's guide",
      href: "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
    },
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    Guide: ChatGptGuide,
    help: {
      name: "OpenAI's guide",
      href: "https://developers.openai.com/plugins/deploy/connect-chatgpt",
    },
  },
  {
    id: "claude-code",
    label: "Claude Code",
    Guide: ClaudeCodeGuide,
    help: { name: "the Claude Code guide", href: "https://code.claude.com/docs/en/mcp" },
  },
  {
    id: "codex",
    label: "Codex",
    Guide: CodexGuide,
    help: { name: "the Codex guide", href: "https://developers.openai.com/codex/mcp" },
  },
  {
    id: "cursor",
    label: "Cursor",
    Guide: CursorGuide,
    help: { name: "the Cursor guide", href: "https://cursor.com/docs/mcp" },
  },
  {
    id: "vscode",
    label: "VS Code",
    Guide: VsCodeGuide,
    help: {
      name: "the VS Code guide",
      href: "https://code.visualstudio.com/docs/agent-customization/mcp-servers",
    },
  },
  { id: "other", label: "Other apps", Guide: OtherGuide, help: null },
];
