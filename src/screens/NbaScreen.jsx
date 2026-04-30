import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { deriveDominantGameState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";
import { filterNbaUiChipsForSlateAndInjuries } from "../lib/nbaUiSurface.js";
import { formatNbaTipoffLocal } from "../lib/nbaTime.js";
import { nbaEventKey } from "../../shared/homeEventDedup.js";

export default function NbaScreen({
  nbaScreenRef,
  hasDockedBar,
  verifiedNbaGames,
  nbaData,
  nbaMsgs,
  nbaBarRef,
  nbaInputRef,
  nbaInput,
  setNbaInput,
  submitNba,
  askBarCommon,
  nbaLoading,
  urTakeTrackPlay = null,
}) {
  const gamesForState = Array.isArray(verifiedNbaGames) ? verifiedNbaGames : [];
  const injuries = Array.isArray(nbaData?.injuries) ? nbaData.injuries : [];
  const playerChips = filterNbaUiChipsForSlateAndInjuries(gamesForState, injuries);
  const nbaQuickPrompts = getQuickPromptsForState("nba", deriveDominantGameState(gamesForState));

  const bannerCounts =
    gamesForState.length > 0
      ? `${gamesForState.filter((g) => g.state === "in").length > 0 ? gamesForState.filter((g) => g.state === "in").length + " live · " : ""}${gamesForState.filter((g) => g.state === "pre").length > 0 ? gamesForState.filter((g) => g.state === "pre").length + " upcoming · " : ""}${gamesForState.length} on verified slate`
      : nbaLoading
        ? "Loading…"
        : "Verified slate empty — off night or board still wiring";

  return (
    <main ref={nbaScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
      <div className="nba-banner">
        <div className="banner-title">NBA</div>
        <div className="banner-sub">PLAYER PROPS · GAME TOTALS · BETTING ANGLES</div>
        <div className="banner-note">{bannerCounts}</div>
      </div>

      {nbaMsgs.length === 0 && (
        <div className="nba-ask-shell" ref={nbaBarRef}>
          <AskBar
            inputRef={nbaInputRef}
            value={nbaInput}
            onChange={setNbaInput}
            onSubmit={() => submitNba()}
            placeholder="Jokic PRA over tonight? Best prop this slate?"
            btnColor="var(--nba)"
            {...askBarCommon}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(nbaQuickPrompts.length
              ? nbaQuickPrompts
              : gamesForState.length > 0
                ? [
                    "Best prop on tonight's verified slate?",
                    "Safest PRA on a game listed above?",
                    "Best game total among listed matchups?",
                  ]
                : ["When does the next verified slate post?", "Best futures read tonight?", "Series price check?"]
            ).map((q) => (
              <button key={q} className="quick-btn" onClick={() => submitNba(q)} style={{ fontSize: 11 }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <ChatThread msgs={nbaMsgs} urTakeTrackPlay={urTakeTrackPlay} />

      {nbaLoading ? (
        <div className="loading-state">
          <div className="loading-text">LOADING NBA DATA...</div>
        </div>
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
              {gamesForState.map((g) => {
                const away = g.awayTeam?.abbr || g.awayTeam?.name || "Away";
                const home = g.homeTeam?.abbr || g.homeTeam?.name || "Home";
                const isLive = g.state === "in";
                const isFinal = g.state === "post";
                const rowKey = nbaEventKey(g) || `${away}-${home}-${g.id ?? ""}`;
                const channel = String(g.channel || g.broadcast || "").trim();
                return (
                  <div
                    key={rowKey}
                    className="nba-game-card"
                    onClick={() => submitNba(`Best prop angle for ${away} vs ${home} tonight?`)}
                  >
                    <div className="nba-game-top">
                      <div className="nba-game-teams">
                        {away} vs {home}
                      </div>
                      <div>
                        {isLive ? (
                          <span className="nba-live-badge">● LIVE</span>
                        ) : (
                          <span className="nba-game-status">
                            {isFinal ? "FINAL" : formatNbaTipoffLocal(g.startTimeUtc)}
                          </span>
                        )}
                      </div>
                    </div>
                    {(isLive || isFinal) && g.awayTeam?.score != null && (
                      <div className="nba-game-score">
                        {g.awayTeam.score} — {g.homeTeam.score}
                      </div>
                    )}
                    {channel ? (
                      <div className="nba-game-status" style={{ marginTop: 4 }}>
                        {channel}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </>
          )}

          {gamesForState.length === 0 && !nbaLoading && (
            <div className="section-divider" style={{ color: "var(--muted)", fontSize: 12 }}>
              No verified NBA games in this window — UR Take will not attach tonight matchups or props.
            </div>
          )}

          {gamesForState.length > 0 && (
            <>
              <div className="section-divider">Quick Prop Angles (verified slate)</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 0 12px" }}>
                {[
                  ["Best PRA on the listed slate?", "Among tonight's verified NBA games only, who has the highest floor PRA? One play."],
                  ["Best 3PM prop (listed games)?", "Among verified matchups on the board, best OVER on threes with volume context."],
                  ["Best game total (listed)?", "Pick one game from the verified slate above — best total OVER or UNDER with pace read."],
                  ["Safest prop (listed slate)?", "Single safest prop among only the games listed above."],
                ].map(([label, q]) => (
                  <button key={label} className="quick-btn" onClick={() => submitNba(q)} style={{ fontSize: 11 }}>
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {playerChips.length > 0 && (
            <>
              <div className="section-divider">Ask About Tonight's Featured Players</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 0 8px" }}>
                {playerChips.map(({ chip }) => (
                  <button
                    key={chip}
                    className="quick-btn"
                    onClick={() => submitNba(`Best prop angle for ${chip} tonight? PRA line, floor, ceiling, and lean.`)}
                    style={{ fontSize: 11 }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
      <div className="page-spacer" />
    </main>
  );
}
