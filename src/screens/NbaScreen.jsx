import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { deriveDominantGameState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";
import { NBA_UI_PLAYER_CHIPS } from "../lib/nbaUiSurface.js";

export default function NbaScreen({
  nbaScreenRef,
  hasDockedBar,
  nbaGames,
  nbaData,
  nbaMsgs,
  nbaBarRef,
  nbaInputRef,
  nbaInput,
  setNbaInput,
  submitNba,
  askBarCommon,
  nbaLoading,
}) {
  const gamesForState =
    Array.isArray(nbaGames) && nbaGames.length > 0
      ? nbaGames
      : Array.isArray(nbaData?.todaysGames)
        ? nbaData.todaysGames
        : [];
  const nbaQuickPrompts = getQuickPromptsForState("nba", deriveDominantGameState(gamesForState));

  return (
          <main ref={nbaScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="nba-banner">
              <div className="banner-title">NBA</div>
              <div className="banner-sub">PLAYER PROPS · GAME TOTALS · BETTING ANGLES</div>
              <div className="banner-note">
                {gamesForState.length > 0
                  ? `${gamesForState.filter((g) => g.state === "in").length > 0 ? gamesForState.filter((g) => g.state === "in").length + " live · " : ""}${gamesForState.filter((g) => g.state === "pre").length > 0 ? gamesForState.filter((g) => g.state === "pre").length + " upcoming · " : ""}${gamesForState.length} games today`
                  : nbaLoading ? "Loading..." : "Ask anything about NBA props"}
              </div>
            </div>

            {nbaMsgs.length===0&&(
              <div className="nba-ask-shell" ref={nbaBarRef}>
              <AskBar inputRef={nbaInputRef} value={nbaInput} onChange={setNbaInput} onSubmit={()=>submitNba()} placeholder="Jokic PRA over tonight? Best prop this slate?" btnColor="var(--nba)" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(nbaQuickPrompts.length ? nbaQuickPrompts : [
                  "Best prop on tonight's slate?",
                  "Safest PRA bet tonight?",
                  "Who has a usage spike today?",
                  "Best game total play?",
                ]).map((q) => (
                  <button key={q} className="quick-btn" onClick={()=>submitNba(q)} style={{fontSize:11}}>{q}</button>
                ))}
              </div>
              </div>
            )}

            <ChatThread msgs={nbaMsgs} />

            {nbaLoading ? (
              <div className="loading-state"><div className="loading-text">LOADING NBA DATA...</div></div>
            ) : (
              <>
                {gamesForState.length > 0 && (
                  <>
                    {(() => {
                      const liveCount = gamesForState.filter((g) => g.state === "in").length;
                      const finalCount = gamesForState.filter((g) => g.state === "post").length;
                      const preCount = gamesForState.filter((g) => g.state === "pre").length;
                      return (
                        <div className="section-divider">
                          {liveCount > 0 ? `${liveCount} Live` : ""}
                          {liveCount > 0 && finalCount + preCount > 0 ? " · " : ""}
                          {finalCount > 0 ? `${finalCount} Final` : ""}
                          {preCount > 0 && liveCount + finalCount > 0 ? " · " : ""}
                          {preCount > 0 ? `${preCount} Upcoming` : ""}
                        </div>
                      );
                    })()}
                    {gamesForState.map((g,i) => {
                      const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
                      const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
                      const isLive = g.state === "in";
                      const isFinal = g.state === "post";
                      return (
                        <div key={g.id||i} className="nba-game-card" onClick={()=>submitNba(`Best prop angle for ${away} vs ${home} tonight?`)}>
                          <div className="nba-game-top">
                            <div className="nba-game-teams">{away} vs {home}</div>
                            <div>{isLive ? <span className="nba-live-badge">● LIVE</span> : <span className="nba-game-status">{isFinal ? "FINAL" : g.status}</span>}</div>
                          </div>
                          {(isLive || isFinal) && g.awayTeam?.score != null && (
                            <div className="nba-game-score">{g.awayTeam.score} — {g.homeTeam.score}</div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="section-divider">Quick Prop Angles</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 12px"}}>
                  {[
                    ["Best PRA bet tonight?", "Who has the highest floor PRA on tonight's slate? Give me floor, ceiling, and lean."],
                    ["Best 3PM prop?", "Who should I bet OVER on 3-pointers made tonight? Give me the play with volume and efficiency context."],
                    ["Injury replacement edge?", "Who has a usage spike tonight due to injury? Find the replacement play with the best prop value."],
                    ["Best game total?", "Which game total on tonight's slate has the sharpest OVER or UNDER? Give me the pace matchup and lean."],
                    ["Safest prop tonight?", "What is the single safest, highest-confidence NBA prop on tonight's slate? One play, full reasoning."],
                    ["Best points prop?", "Who has the best points OVER tonight? Give me the matchup, defensive ranking they're facing, and lean."],
                  ].map(([label, q]) => (
                    <button key={label} className="quick-btn" onClick={()=>submitNba(q)} style={{fontSize:11}}>{label}</button>
                  ))}
                </div>

                <div className="section-divider">Ask About Any Player</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 0 8px"}}>
                  {NBA_UI_PLAYER_CHIPS.map(({ chip }) => (
                    <button key={chip} className="quick-btn" onClick={()=>submitNba(`Best prop angle for ${chip} tonight? PRA line, floor, ceiling, and lean.`)} style={{fontSize:11}}>{chip}</button>
                  ))}
                </div>
              </>
            )}
            <div className="page-spacer"/>
          </main>
  );
}
