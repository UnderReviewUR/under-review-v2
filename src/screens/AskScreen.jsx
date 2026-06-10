import { Component, useMemo } from "react";
import AskBar from "../components/AskBar.jsx";
import AskUrTakeRetentionStrip from "../components/AskUrTakeRetentionStrip.jsx";
import { ChatThread, inferUrTakeSportFromMessages } from "../features/app/helpers.jsx";
import { logUrTakeMsgsRenderDiagnostics, logSavedTakesRenderDiagnostics, textOrEmpty } from "../lib/urTakeRenderSafe.js";
import { getUrBuildFingerprint } from "../lib/urBuildFingerprint.js";

/** Flip one at a time in production to bisect DISPLAY SAFE MODE without redeploying logic. */
const DEBUG_HIDE_SESSION_HEADER = false;
const DEBUG_HIDE_CHAT_THREAD = false;
const DEBUG_HIDE_RETENTION_STRIP = false;

function clipDiag(value, maxChars = 3500) {
  const s = String(value ?? "");
  if (s.length <= maxChars) return s;
  return `${s.slice(0, maxChars)}… (${s.length} chars total)`;
}

function buildThreadDebugSummary(safeAskMsgs) {
  const list = Array.isArray(safeAskMsgs) ? safeAskMsgs : [];
  const last = list.length ? list[list.length - 1] : null;
  let lastKeys = [];
  let lastStructuredKeys = [];
  if (last && typeof last === "object") {
    try {
      lastKeys = Object.keys(last).slice(0, 48);
    } catch {
      lastKeys = ["<Object.keys threw>"];
    }
    if (last.structured && typeof last.structured === "object") {
      try {
        lastStructuredKeys = Object.keys(last.structured).slice(0, 48);
      } catch {
        lastStructuredKeys = ["<Object.keys threw>"];
      }
    }
  }
  const roles = list.map((m) => (m && typeof m === "object" && m.role) || "?").join(",");
  return {
    length: list.length,
    roles,
    lastKeys,
    lastRole: last && typeof last === "object" ? last.role ?? null : null,
    lastLoading: last && typeof last === "object" && "loading" in last ? last.loading : null,
    lastTextType: last == null ? "none" : typeof last.text,
    lastStructuredKeys,
  };
}

class UrTakeChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: false,
      errName: "",
      errMessage: "",
      errStack: "",
      componentStack: "",
    };
  }

  static getDerivedStateFromError(err) {
    const name = err instanceof Error ? String(err.name) : typeof err;
    const message =
      err instanceof Error && err.message != null
        ? String(err.message)
        : String(err != null ? err : "unknown error");
    const stack = err instanceof Error && err.stack != null ? clipDiag(err.stack, 4000) : "";
    return {
      error: true,
      errName: name,
      errMessage: message,
      errStack: stack,
      componentStack: "",
    };
  }

  componentDidCatch(err, info) {
    console.error("[UrTakeChatErrorBoundary]", err, info?.componentStack);
    const cs = info?.componentStack != null ? clipDiag(info.componentStack, 4000) : "";
    this.setState({ componentStack: cs });
  }

  render() {
    if (this.state.error) {
      const fp = getUrBuildFingerprint();
      const thread = this.props.threadDebug ?? null;
      const diag = {
        errName: this.state.errName,
        errMessage: this.state.errMessage,
        errStack: this.state.errStack,
        componentStack: this.state.componentStack,
        buildFingerprint: fp,
        threadDebug: thread,
        debugFlags: {
          DEBUG_HIDE_SESSION_HEADER,
          DEBUG_HIDE_CHAT_THREAD,
          DEBUG_HIDE_RETENTION_STRIP,
        },
      };
      return (
        <div
          className="ur-ask-thread-fallback"
          style={{
            minHeight: "min(40vh, 280px)",
            maxHeight: "min(85vh, 720px)",
            overflow: "auto",
            padding: "20px 18px",
            margin: "0 4px",
            borderRadius: 12,
            background: "rgba(15,18,21,0.96)",
            border: "1px solid rgba(0,245,233,0.22)",
            color: "#E8EAF0",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, letterSpacing: 1.2, color: "#00F5E9", marginBottom: 10 }}>
            DISPLAY SAFE MODE
          </div>
          <p style={{ marginBottom: 12 }}>
            That take couldn&apos;t render. Use the header <strong style={{ color: "#fff" }}>back</strong> arrow, then open UR Take again, or refresh the page.
          </p>
          <pre
            style={{
              marginTop: 4,
              fontFamily: "var(--mono-font, ui-monospace, monospace)",
              fontSize: 10,
              letterSpacing: 0.3,
              color: "rgba(232,234,240,0.88)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "rgba(0,0,0,0.35)",
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {JSON.stringify(diag, null, 2)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function sessionSportLabel(slug) {
  const s = textOrEmpty(slug, 200).toLowerCase();
  const map = {
    nba: "NBA",
    nfl: "NFL",
    mlb: "MLB",
    tennis: "Tennis",
    tennis_wta_profile: "WTA",
    golf: "Golf",
    f1: "F1",
    worldcup: "World Cup",
    generic: "Multi-sport",
  };
  return map[s] || (s ? s.replace(/_/g, " ").toUpperCase() : "Multi-sport");
}

/** Soft context label (informational only — does not block cross-sport questions). */
function sessionContextLine(inferredSlug) {
  const s = textOrEmpty(inferredSlug, 200).trim().toLowerCase();
  if (!s || s === "generic") return null;
  return `Context loaded: ${sessionSportLabel(inferredSlug)}`;
}

export default function AskScreen({
  askScreenRef,
  hasDockedBar: _hasDockedBar,
  askMsgs,
  focusSession = false,
  askInputRef,
  askInput,
  setAskInput,
  submitAsk,
  askBarCommon,
  dynamicHomeQuestions,
  firePrompt,
  urTakeTrackPlay = null,
  accessTier,
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
  fileInputRef = null,
  savedTakes = [],
  onSaveLastUrTake = null,
  onOpenSavedTake = null,
  golfSessionBoard = null,
}) {
  const safeAskMsgs = useMemo(
    () => (Array.isArray(askMsgs) ? askMsgs.filter((m) => m && typeof m === "object") : []),
    [askMsgs],
  );
  const safeSavedTakes = useMemo(
    () => (Array.isArray(savedTakes) ? savedTakes.filter((t) => t && typeof t === "object") : []),
    [savedTakes],
  );

  const inferredSport = inferUrTakeSportFromMessages(safeAskMsgs);
  const questionCount = safeAskMsgs.filter((m) => m.role === "user").length;
  const sessionContextLabel = sessionContextLine(inferredSport);
  const threadDebug = useMemo(() => buildThreadDebugSummary(safeAskMsgs), [safeAskMsgs]);

  /** Runs before `UrTakeChatErrorBoundary` children — survives outer safe-mode crashes. */
  useMemo(() => {
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      console.warn("[AskScreen pre-render]", {
        isArray: Array.isArray(askMsgs),
        len: Array.isArray(askMsgs) ? askMsgs.length : null,
        last: Array.isArray(askMsgs) ? askMsgs.at(-1) : askMsgs,
        safeLen: safeAskMsgs.length,
        savedTakesIsArray: Array.isArray(savedTakes),
        savedTakesLen: Array.isArray(savedTakes) ? savedTakes.length : null,
        safeSavedLen: safeSavedTakes.length,
      });
      logUrTakeMsgsRenderDiagnostics(safeAskMsgs);
      logSavedTakesRenderDiagnostics(safeSavedTakes);
    }
    return null;
  }, [askMsgs, savedTakes, safeAskMsgs, safeSavedTakes]);

  return (
          <main
            ref={askScreenRef}
            className={`screen${safeAskMsgs.length > 0 ? " has-msgs screen--ur-chat" : ""}${focusSession ? " screen--ur-focus" : ""}`}
          >
            {safeAskMsgs.length === 0 ? (
              <>
                <section className="hero" style={{paddingTop:4}}><div className="hero-title">UR TAKE</div><div className="hero-sub">Ask in plain English. Paste a screenshot. Get weirdly specific.</div></section>
                <AskBar
                  inputRef={askInputRef}
                  value={askInput}
                  onChange={setAskInput}
                  onSubmit={submitAsk}
                  placeholder="What do you want to know?"
                  showPasteHint={false}
                  {...askBarCommon}
                />
                <section className="section"><div className="section-label">TRY ONE</div><div className="q-list">{dynamicHomeQuestions.map(q=><button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt, q.sportHint || null, q.id)}><div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{textOrEmpty(q.text, 400)}</div></div></button>)}</div></section>
              </>
            ) : (
              <UrTakeChatErrorBoundary
                key={String(safeAskMsgs.at(-1)?.msgId ?? safeAskMsgs.length)}
                threadDebug={threadDebug}
              >
                {!DEBUG_HIDE_SESSION_HEADER && !focusSession ? (
                  <>
                    <div className="ur-session-context-header" aria-live="polite">
                      <span className="ur-session-context-kicker">UR TAKE</span>
                      <span className="ur-session-context-divider" aria-hidden>
                        ·
                      </span>
                      <span className="ur-session-context-sport">{sessionSportLabel(inferredSport || "generic")}</span>
                      <span className="ur-session-context-divider" aria-hidden>
                        ·
                      </span>
                      <span className="ur-session-context-meta">
                        {questionCount} {questionCount === 1 ? "question" : "questions"}
                      </span>
                    </div>
                    {sessionContextLabel ? (
                      <div className="ur-session-locked-line ur-session-context-soft">
                        {sessionContextLabel}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    className="ur-session-context-header ur-session-context-header--focus-hidden"
                    aria-hidden="true"
                  />
                )}
                <div className="ur-chat-scroll">
                  {!DEBUG_HIDE_CHAT_THREAD ? (
                    <ChatThread
                      msgs={safeAskMsgs}
                      urTakeTrackPlay={urTakeTrackPlay}
                      accessTier={accessTier}
                      onUrTakeFollowUpPick={onUrTakeFollowUpPick}
                      onUpgradePromptClick={onUpgradePromptClick}
                      hideFollowUpDock
                      focusSession={focusSession}
                      golfSessionBoard={golfSessionBoard}
                      variant="urChatDocked"
                    />
                  ) : null}
                </div>
                {!DEBUG_HIDE_RETENTION_STRIP ? (
                  <AskUrTakeRetentionStrip
                    askMsgs={safeAskMsgs}
                    fileInputRef={fileInputRef}
                    onSaveTake={onSaveLastUrTake}
                    savedTakes={safeSavedTakes}
                    onOpenSavedTake={onOpenSavedTake}
                    focusSession={focusSession}
                  />
                ) : null}
              </UrTakeChatErrorBoundary>
            )}
          </main>
  );
}
