import AskBar from "../components/AskBar.jsx";
import UrTakeOnboardingOverlay from "../components/UrTakeOnboardingOverlay.jsx";
import { ChatThread, inferUrTakeSportFromMessages } from "../features/app/helpers.jsx";

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
}) {
  const inferredSport = inferUrTakeSportFromMessages(askMsgs);
  const questionCount = askMsgs.filter((m) => m.role === "user").length;

  return (
          <main
            ref={askScreenRef}
            className={`screen${askMsgs.length > 0 ? " has-msgs screen--ur-chat" : ""}`}
          >
            {askMsgs.length === 0 ? (
              <>
                <UrTakeOnboardingOverlay visible />
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
                <section className="section"><div className="section-label">TRY ONE</div><div className="q-list">{dynamicHomeQuestions.map(q=><button key={q.id} className="q-card" onClick={()=>firePrompt(q.prompt, q.sportHint || null)}><div className="q-top"><div className="q-accent" style={{background:q.color}}/><div className="q-text">{q.text}</div></div></button>)}</div></section>
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
                <div className="ur-chat-scroll">
                  <ChatThread
                    msgs={askMsgs}
                    urTakeTrackPlay={urTakeTrackPlay}
                    accessTier={accessTier}
                    onUrTakeFollowUpPick={onUrTakeFollowUpPick}
                    onUpgradePromptClick={onUpgradePromptClick}
                    hideFollowUpDock
                    variant="urChatDocked"
                  />
                </div>
              </>
            )}
          </main>
  );
}
