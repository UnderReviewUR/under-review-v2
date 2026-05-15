import { Component } from "react";
import AskBar from "../components/AskBar.jsx";
import AskUrTakeRetentionStrip from "../components/AskUrTakeRetentionStrip.jsx";
import { ChatThread, inferUrTakeSportFromMessages } from "../features/app/helpers.jsx";

class UrTakeChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError() {
    return { error: true };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="ur-ask-thread-fallback"
          style={{
            padding: "16px 20px",
            color: "var(--muted)",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          That take couldn&apos;t render in the app (display bug). Use the header back arrow, then open UR Take
          again — or refresh the page. Your account data is fine.
        </div>
      );
    }
    return this.props.children;
  }
}

function sessionSportLabel(slug) {
  const s = String(slug || "").toLowerCase();
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
  const s = String(inferredSlug || "").trim().toLowerCase();
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
  const inferredSport = inferUrTakeSportFromMessages(askMsgs);
  const questionCount = askMsgs.filter((m) => m.role === "user").length;
  const lockedLine = lockedContextLine(inferredSport);

  return (
          <main
            ref={askScreenRef}
            className={`screen${askMsgs.length > 0 ? " has-msgs screen--ur-chat" : ""}`}
          >
            {askMsgs.length === 0 ? (
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
                <section className="section"><div className="section-label">TRY ONE</div><div className="q-list">{dynamicHomeQuestions.map(q=><button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt, q.sportHint || null, q.id)}><div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{q.text}</div></div></button>)}</div></section>
              </>
            ) : (
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
                {lockedLine ? <div className="ur-session-locked-line">{lockedLine}</div> : null}
                <div className="ur-chat-scroll">
                  <UrTakeChatErrorBoundary key={askMsgs.length}>
                    <ChatThread
                      msgs={askMsgs}
                      urTakeTrackPlay={urTakeTrackPlay}
                      accessTier={accessTier}
                      onUrTakeFollowUpPick={onUrTakeFollowUpPick}
                      onUpgradePromptClick={onUpgradePromptClick}
                      hideFollowUpDock
                      variant="urChatDocked"
                    />
                  </UrTakeChatErrorBoundary>
                </div>
                <AskUrTakeRetentionStrip
                  askMsgs={askMsgs}
                  fileInputRef={fileInputRef}
                  onSaveTake={onSaveLastUrTake}
                  savedTakes={savedTakes}
                  onOpenSavedTake={onOpenSavedTake}
                />
              </>
            )}
          </main>
  );
}
