import { Component, useMemo } from "react";
import AskBar from "../components/AskBar.jsx";
import AskUrTakeRetentionStrip from "../components/AskUrTakeRetentionStrip.jsx";
import { ChatThread, inferUrTakeSportFromMessages } from "../features/app/helpers.jsx";
import { logUrTakeMsgsRenderDiagnostics, logSavedTakesRenderDiagnostics, textOrEmpty } from "../lib/urTakeRenderSafe.js";
import { getUrBuildFingerprint } from "../lib/urBuildFingerprint.js";

class UrTakeChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(err, info) {
    console.error("[UrTakeChatErrorBoundary]", err, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="ur-ask-thread-fallback"
          style={{
            minHeight: "min(40vh, 280px)",
            padding: "20px 18px",
            margin: "0 4px",
            borderRadius: 12,
            background: "rgba(15,18,21,0.96)",
            border: "1px solid rgba(0,245,233,0.22)",
            color: "#E8EAF0",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <div style={{ fontFamily: "var(--mono-font)", fontSize: 10, letterSpacing: 1.2, color: "#00F5E9", marginBottom: 10 }}>
            DISPLAY SAFE MODE
          </div>
          That take couldn&apos;t render. Use the header <strong style={{ color: "#fff" }}>back</strong> arrow, then open UR Take again, or refresh the page.
          <pre
            style={{
              marginTop: 14,
              fontFamily: "var(--mono-font, ui-monospace, monospace)",
              fontSize: 10,
              letterSpacing: 0.4,
              color: "rgba(232,234,240,0.55)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {JSON.stringify(getUrBuildFingerprint(), null, 2)}
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
    generic: "Multi-sport",
  };
  return map[s] || (s ? s.replace(/_/g, " ").toUpperCase() : "Multi-sport");
}

/** Deterministic context chip; hidden when sport is unknown or generic. */
function lockedContextLine(inferredSlug) {
  const s = textOrEmpty(inferredSlug, 200).trim().toLowerCase();
  if (!s || s === "generic") return null;
  return `Locked: ${sessionSportLabel(inferredSlug)} tonight`;
}

export default function AskScreen({
  askScreenRef,
  hasDockedBar: _hasDockedBar,
  askMsgs,
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
  const lockedLine = lockedContextLine(inferredSport);

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
            className={`screen${safeAskMsgs.length > 0 ? " has-msgs screen--ur-chat" : ""}`}
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
              >
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
                {lockedLine ? <div className="ur-session-locked-line">{lockedLine}</div> : null}
                <div className="ur-chat-scroll">
                  <ChatThread
                    msgs={safeAskMsgs}
                    urTakeTrackPlay={urTakeTrackPlay}
                    accessTier={accessTier}
                    onUrTakeFollowUpPick={onUrTakeFollowUpPick}
                    onUpgradePromptClick={onUpgradePromptClick}
                    hideFollowUpDock
                    variant="urChatDocked"
                  />
                </div>
                <AskUrTakeRetentionStrip
                  askMsgs={safeAskMsgs}
                  fileInputRef={fileInputRef}
                  onSaveTake={onSaveLastUrTake}
                  savedTakes={safeSavedTakes}
                  onOpenSavedTake={onOpenSavedTake}
                />
              </UrTakeChatErrorBoundary>
            )}
          </main>
  );
}
