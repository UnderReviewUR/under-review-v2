import AskBar from "../components/AskBar.jsx";
import UrChatDockScrollSpacer from "../components/UrChatDockScrollSpacer.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";

export default function LaligaScreen({
  laligaScreenRef,
  hasDockedBar,
  laligaMsgs,
  laligaBarRef,
  laligaInputRef,
  laligaInput,
  setLaligaInput,
  submitLaliga,
  askBarCommon,
  urTakeTrackPlay = null,
  accessTier,
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
  laligaMatches = [],
  laligaPropLines = [],
  laligaStandings = [],
  laligaBoardLoading = false,
  laligaBoardAsOf = null,
}) {
  const quickPrompts = getQuickPromptsForState("laliga", "live");
  const urDockedChat = hasDockedBar && laligaMsgs.length > 0;
  const chatThreadProps = {
    msgs: laligaMsgs,
    urTakeTrackPlay,
    accessTier,
    onUrTakeFollowUpPick,
    onUpgradePromptClick,
    hideFollowUpDock: true,
  };

  const format1x2 = (m) => {
    const ml = m.moneyline;
    if (!ml) return "";
    const parts = [];
    if (ml.home != null) parts.push(`H ${ml.home}`);
    if (ml.draw != null) parts.push(`D ${ml.draw}`);
    if (ml.away != null) parts.push(`A ${ml.away}`);
    return parts.length ? ` · ${parts.join(" / ")}` : "";
  };

  return (
    <main
      ref={laligaScreenRef}
      className={`screen${urDockedChat ? " has-msgs screen--ur-chat" : hasDockedBar ? " has-msgs" : ""}`}
    >
      <div className="nfl-banner" style={{ borderColor: "rgba(238, 68, 68, 0.35)" }}>
        <div className="banner-title">La Liga Board</div>
        <div className="banner-sub">
          {laligaBoardAsOf ? `Updated ${new Date(laligaBoardAsOf).toLocaleTimeString()}` : "Matchweek slate"}
        </div>
      </div>

      {urDockedChat ? (
        <div className="ur-chat-scroll">
          <ChatThread {...chatThreadProps} />
          <UrChatDockScrollSpacer />
        </div>
      ) : (
        <>
          <div className="quick-prompts">
            {quickPrompts.map((p) => (
              <button key={p} type="button" className="quick-prompt" onClick={() => submitLaliga(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="section-divider">Fixtures</div>
          {laligaBoardLoading && !laligaMatches.length ? (
            <div className="loading-state">
              <div className="loading-text">LOADING LA LIGA...</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {laligaMatches.map((m, i) => (
                <div
                  key={m.providerMatchId || i}
                  role="button"
                  tabIndex={0}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "9px 10px",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    submitLaliga(
                      `${m.awayAbbr} @ ${m.homeAbbr} — side or best prop?${format1x2(m)}`,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitLaliga(`${m.awayAbbr} @ ${m.homeAbbr} — your take?`);
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {m.awayAbbr} @ {m.homeAbbr}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                    {m.status || "Scheduled"}
                    {format1x2(m)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {laligaStandings.length > 0 && (
            <>
              <div className="section-divider">Table snapshot</div>
              <div style={{ fontSize: 11, color: "var(--soft)", lineHeight: 1.6, marginBottom: 12 }}>
                {laligaStandings.slice(0, 6).map((s) => (
                  <div key={s.team || s.teamName}>
                    {s.position}. {s.teamName || s.team} — {s.points} pts
                  </div>
                ))}
              </div>
            </>
          )}
          {laligaPropLines.length > 0 && (
            <>
              <div className="section-divider">Player props</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {laligaPropLines.slice(0, 12).map((p, i) => (
                  <button
                    key={`${p.player}-${p.prop}-${i}`}
                    type="button"
                    className="quick-prompt"
                    style={{ textAlign: "left" }}
                    onClick={() =>
                      submitLaliga(`${p.player} ${p.prop} ${p.line} — over or under?`)
                    }
                  >
                    {p.player} · {p.prop} {p.line}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <AskBar
        inputRef={laligaInputRef}
        barRef={laligaBarRef}
        value={laligaInput}
        onChange={setLaligaInput}
        onSubmit={() => submitLaliga()}
        placeholder="Ask about La Liga sides, totals, or props..."
        btnColor="#EE4444"
        {...askBarCommon}
      />
    </main>
  );
}
