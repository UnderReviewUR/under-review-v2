import AskBar from "../components/AskBar.jsx";
import UrChatDockScrollSpacer from "../components/UrChatDockScrollSpacer.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";

export default function CfbScreen({
  cfbScreenRef,
  hasDockedBar,
  cfbMsgs,
  cfbBarRef,
  cfbInputRef,
  cfbInput,
  setCfbInput,
  submitCfb,
  askBarCommon,
  urTakeTrackPlay = null,
  accessTier,
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
  cfbGames = [],
  cfbPropLines = [],
  cfbBoardLoading = false,
  cfbBoardAsOf = null,
}) {
  const quickPrompts = getQuickPromptsForState("cfb", "live");
  const urDockedChat = hasDockedBar && cfbMsgs.length > 0;
  const chatThreadProps = {
    msgs: cfbMsgs,
    urTakeTrackPlay,
    accessTier,
    onUrTakeFollowUpPick,
    onUpgradePromptClick,
    hideFollowUpDock: true,
  };

  const formatOddsSnippet = (g) => {
    if (g.spread?.home != null) return ` spread ${g.spread.home}`;
    if (g.total?.line != null) return ` total ${g.total.line}`;
    if (g.moneyline?.home != null) return ` ML ${g.moneyline.home}/${g.moneyline.away}`;
    return "";
  };

  return (
    <main
      ref={cfbScreenRef}
      className={`screen${urDockedChat ? " has-msgs screen--ur-chat" : hasDockedBar ? " has-msgs" : ""}`}
    >
      <div className="nfl-banner" style={{ borderColor: "rgba(196, 98, 45, 0.35)" }}>
        <div className="banner-title">College Football Board</div>
        <div className="banner-sub">
          {cfbBoardAsOf ? `Updated ${new Date(cfbBoardAsOf).toLocaleTimeString()}` : "Live slate"}
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
              <button key={p} type="button" className="quick-prompt" onClick={() => submitCfb(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="section-divider">This week&apos;s slate</div>
          {cfbBoardLoading && !cfbGames.length ? (
            <div className="loading-state">
              <div className="loading-text">LOADING CFB BOARD...</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {cfbGames.map((g, i) => (
                <div
                  key={g.providerGameId || i}
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
                    submitCfb(
                      `Best angle on ${g.awayAbbr} @ ${g.homeAbbr}? Spread, total, or prop lean.${formatOddsSnippet(g)}`,
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      submitCfb(`Best angle on ${g.awayAbbr} @ ${g.homeAbbr}?`);
                    }
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {g.awayAbbr} @ {g.homeAbbr}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>
                    {g.status || "Scheduled"}
                    {formatOddsSnippet(g)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {cfbPropLines.length > 0 && (
            <>
              <div className="section-divider">Live player props</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cfbPropLines.slice(0, 12).map((p, i) => (
                  <button
                    key={`${p.player}-${p.prop}-${i}`}
                    type="button"
                    className="quick-prompt"
                    style={{ textAlign: "left" }}
                    onClick={() =>
                      submitCfb(
                        `${p.player} ${p.prop} ${p.line} — over or under? (${p.book || "book"})`,
                      )
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
        inputRef={cfbInputRef}
        barRef={cfbBarRef}
        value={cfbInput}
        onChange={setCfbInput}
        onSubmit={() => submitCfb()}
        placeholder="Ask about spreads, totals, or CFB props..."
        btnColor="#C4622D"
        {...askBarCommon}
      />
    </main>
  );
}
