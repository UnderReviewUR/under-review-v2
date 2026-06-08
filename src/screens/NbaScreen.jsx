import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { deriveDominantGameState, getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";
import { NbaPlayerCard } from "../components/cards/NbaPlayerCard.jsx";
import { filterNbaUiChipsForSlateAndInjuries } from "../lib/nbaUiSurface.js";
import { resolveStatRowForUiChip } from "../../shared/nbaPropsBoardDisplay.js";
import {
  formatNbaGameTipoffWithDay,
  formatNbaSlateBannerLine,
  formatNbaTipoffLocal,
  getEtHour24,
} from "../lib/nbaTime.js";
import { nbaEventKey } from "../../shared/homeEventDedup.js";
import { formatNbaLiveContextLabel } from "../lib/nbaLiveContextLabel.js";

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
  accessTier,
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
  getSeriesLabel = null,
}) {
  const gamesForState = Array.isArray(verifiedNbaGames) ? verifiedNbaGames : [];
  const featuredGame = gamesForState[0] || null;
  const playoffSeries = Array.isArray(nbaData?.playoffSeries) ? nbaData.playoffSeries : [];
  const injuries = Array.isArray(nbaData?.injuries) ? nbaData.injuries : [];
  const playerChips = filterNbaUiChipsForSlateAndInjuries(gamesForState, injuries);
  const playerStats = Array.isArray(nbaData?.playerStats) ? nbaData.playerStats : [];
  const propsFreshness =
    nbaData?.propsOdds?.freshness || nbaData?.sourceMeta?.propsOddsFetchedAt
      ? {
          stale: Boolean(nbaData?.propsOddsStale ?? nbaData?.propsOdds?.freshness?.isStale),
          fetchedAt: nbaData?.propsOdds?.fetchedAt || nbaData?.sourceMeta?.propsOddsFetchedAt,
        }
      : null;
  const nbaQuickPrompts = getQuickPromptsForState("nba", deriveDominantGameState(gamesForState));
  const slateHasLive = gamesForState.some((g) => g.state === "in");

  const slateNote = String(nbaData?.todaysGamesSlateMeta?.note || "").trim();
  const apiGamesLen = Array.isArray(nbaData?.todaysGames) ? nbaData.todaysGames.length : 0;

  const featuredSeriesLabel =
    featuredGame && typeof getSeriesLabel === "function"
      ? getSeriesLabel(
          featuredGame.awayTeam?.abbr,
          featuredGame.homeTeam?.abbr,
        )
      : null;

  const liveGame = gamesForState.find((g) => g.state === "in") || null;
  const liveContextLabel = formatNbaLiveContextLabel(liveGame, playoffSeries);

  const bannerCounts =
    liveContextLabel
      ? liveContextLabel
      : featuredGame
      ? formatNbaSlateBannerLine(featuredGame, featuredSeriesLabel)
      : nbaLoading
        ? "Loading…"
        : !nbaData
          ? "Board loading — pull to refresh"
          : slateNote
            ? slateNote
            : apiGamesLen === 0
              ? getEtHour24() < 12
                ? "No verified NBA games in the next 48 hours — check back after noon ET"
                : "NO VERIFIED NBA GAMES IN THIS WINDOW"
              : "NO VERIFIED NBA GAMES IN THIS WINDOW";

  const askPlaceholder = featuredGame
    ? (() => {
        const away = featuredGame.awayTeam?.abbr || featuredGame.awayTeam?.name || "Away";
        const home = featuredGame.homeTeam?.abbr || featuredGame.homeTeam?.name || "Home";
        const series = featuredSeriesLabel || "matchup";
        const dayWord =
          featuredGame.slateDayLabel === "Tomorrow" ? "tomorrow" : "tonight";
        return `Ask about ${away} @ ${home} ${series} ${dayWord}`;
      })()
    : "Ask about any playoff matchup or prop in the next 48 hours";

  const urDockedChat = hasDockedBar && nbaMsgs.length > 0;

  const chatThreadProps = {
    msgs: nbaMsgs,
    urTakeTrackPlay,
    accessTier,
    onUrTakeFollowUpPick,
    onUpgradePromptClick,
    hideFollowUpDock: true,
  };

  const nbaBoardBelow =
    nbaLoading ? (
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
                          {isFinal
                            ? "FINAL"
                            : formatNbaGameTipoffWithDay(
                                g,
                                typeof getSeriesLabel === "function"
                                  ? getSeriesLabel(
                                      g.awayTeam?.abbr,
                                      g.homeTeam?.abbr,
                                    )
                                  : null,
                              )}
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
            NO VERIFIED NBA GAMES IN THIS WINDOW — nothing on the verified slate in the next 48 hours (ET).
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
            <div className="section-divider">
              {slateHasLive ? "Live prop angles" : "Tonight\u2019s Featured Players"}
              {propsFreshness?.stale
                ? " · lines may be stale"
                : slateHasLive
                  ? " · refreshed ~18s"
                  : ""}
            </div>
            <div className="nba-player-card-grid">
              {playerChips.map((row) => (
                <NbaPlayerCard
                  key={row.chip}
                  chip={row.chip}
                  fullName={row.fullName}
                  teamAbbr={row.teamAbbr}
                  statRow={resolveStatRowForUiChip(row, playerStats)}
                  onAsk={submitNba}
                  isLiveSlate={slateHasLive}
                />
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 0 8px" }}>
              {playerChips.map(({ chip }) => (
                <button
                  key={`q-${chip}`}
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
    );

  return (
    <main ref={nbaScreenRef} className={`screen${urDockedChat ? " has-msgs screen--ur-chat" : hasDockedBar ? " has-msgs" : ""}`}>
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
            placeholder={askPlaceholder}
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

      {urDockedChat ? (
        <div className="ur-chat-scroll">
          <ChatThread {...chatThreadProps} variant="urChatDocked" />
          {nbaBoardBelow}
          <div className="page-spacer" />
        </div>
      ) : (
        <>
          <ChatThread {...chatThreadProps} />
          {nbaBoardBelow}
          <div className="page-spacer" />
        </>
      )}
    </main>
  );
}
