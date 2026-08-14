import AskBar from "../components/AskBar.jsx";
import NflSlateTakesCard from "../components/NflSlateTakesCard.jsx";
import UrChatDockScrollSpacer from "../components/UrChatDockScrollSpacer.jsx";
import { ChatThread, isNflRampMode } from "../features/app/helpers.jsx";
import { getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";
import { mapNflBoardPropLinesToGuide } from "../lib/mapNflBoardPropLines.js";
import NflGameBoardSection from "../features/nfl/NflGameBoardSection.jsx";
import NflPropGuideSection from "../features/nfl/NflPropGuideSection.jsx";
import { NFL_POSITIONS, NFL_PROP_GUIDE } from "../features/app/constants.js";
import { NflPlayerCard } from "../components/cards/NflPlayerCard.jsx";

export default function NflScreen({
  nflScreenRef,
  hasDockedBar,
  nflSeasonMode,
  nflMsgs,
  nflBarRef,
  nflInputRef,
  nflInput,
  setNflInput,
  submitNfl,
  askBarCommon,
  nflPosFilter,
  setNflPosFilter,
  filteredNflPlayers,
  openNflPlayer,
  urTakeTrackPlay = null,
  accessTier,
  onUrTakeFollowUpPick = null,
  onUpgradePromptClick = null,
  nflGames = [],
  nflPropLines = [],
  nflBoardLoading = false,
  nflBoardAsOf = null,
}) {
  const nflQuickPrompts = getQuickPromptsForState(
    "nfl",
    nflSeasonMode ? "live" : isNflRampMode() ? "pre" : "futures",
  );
  const nflRamp = !nflSeasonMode && isNflRampMode();
  const urDockedChat = hasDockedBar && nflMsgs.length > 0;
  const liveGuide = mapNflBoardPropLinesToGuide(nflPropLines);
  const propGuide = liveGuide.length ? liveGuide : NFL_PROP_GUIDE;
  const usingLiveProps = liveGuide.length > 0;

  const chatThreadProps = {
    msgs: nflMsgs,
    urTakeTrackPlay,
    accessTier,
    onUrTakeFollowUpPick,
    onUpgradePromptClick,
    hideFollowUpDock: true,
  };

  const isUnlimited =
    accessTier === "owner" || accessTier === "friend" || accessTier === "pro";

  const nflBoardBelow = (
    <>
      <NflSlateTakesCard
        games={nflGames}
        asOf={nflBoardAsOf}
        isUnlimited={isUnlimited}
        askLive
        onOpenUpgrade={onUpgradePromptClick}
        onSelectLane={(lane) => {
          if (!lane?.question) return;
          submitNfl(lane.question);
        }}
      />
      <NflGameBoardSection
        games={nflGames}
        loading={nflBoardLoading}
        asOf={nflBoardAsOf}
        onSelectGame={(g) => {
          const away = g.awayAbbr || "Away";
          const home = g.homeAbbr || "Home";
          const tot = g.total?.line != null ? ` Total ${g.total.line}.` : "";
          submitNfl(`Best prop or total angle for ${away} @ ${home}?${tot}`);
        }}
      />
      <div className="section-divider">
        {usingLiveProps ? "Live player props" : nflSeasonMode ? "Top Weekly Leans" : "Top Future Leans"}
      </div>
      <NflPropGuideSection
        guide={propGuide}
        onSelectProp={(prop) =>
          submitNfl(
            prop.live
              ? `Tell me about ${prop.player} ${prop.propType} — line ${prop.line}${prop.game ? ` (${prop.game})` : ""}. Over ${prop.overOdds ?? "—"} / Under ${prop.underOdds ?? "—"}.`
              : `Tell me about ${prop.player} ${prop.propType} prop — line is ${prop.line}`,
          )
        }
      />
      <div className="section-divider">Player Database</div>
      <div className="pos-tabs">
        {NFL_POSITIONS.map((pos) => (
          <button
            key={pos}
            className={`pos-tab${nflPosFilter === pos ? " active" : ""}`}
            onClick={() => setNflPosFilter(pos)}
          >
            {pos}
          </button>
        ))}
      </div>
      {filteredNflPlayers.map(([name, player]) => (
        <NflPlayerCard key={name} name={name} player={player} onOpen={openNflPlayer} />
      ))}
    </>
  );

  return (
    <main
      ref={nflScreenRef}
      className={`screen${urDockedChat ? " has-msgs screen--ur-chat" : hasDockedBar ? " has-msgs" : ""}`}
    >
      <div className="nfl-banner">
        <div className="banner-title">
          {nflSeasonMode ? "NFL In-Season Board" : "NFL Live Board"}
        </div>
        <div className="banner-sub">
          {usingLiveProps
            ? "LIVE LINES · GAME O/U · PLAYER PROPS"
            : nflSeasonMode
              ? "WEEKLY PROPS · USAGE · PLAYER ANGLES"
              : nflRamp
                ? "PRESEASON BOARD · SIDES · TOTALS"
                : "FUTURES · PLAYER STATS · BETTING ANGLES"}
        </div>
        <div className="banner-note">
          {usingLiveProps
            ? "DraftKings-priority lines via Action Network — implied probs on totals and props."
            : nflSeasonMode
              ? "Current weekly props, role changes, usage shifts, and market edges."
              : nflRamp
                ? "Posted sides and totals. Ask the board. Pass is a take until inactives."
                : "Skill positions database with per-game stats, TD rates, prop floors and ceilings."}
          {!usingLiveProps ? (
            <span
              style={{
                marginLeft: 8,
                fontFamily: "var(--mono-font)",
                fontSize: 9,
                letterSpacing: 1,
                color: "var(--muted)",
              }}
              title="Player database is hand-maintained — verify lines against your book"
            >
              Est.
            </span>
          ) : null}
        </div>
      </div>
      {nflMsgs.length === 0 && (
        <div className="nfl-ask-shell" ref={nflBarRef}>
          <AskBar
            inputRef={nflInputRef}
            value={nflInput}
            onChange={setNflInput}
            onSubmit={() => submitNfl()}
            placeholder={
              nflSeasonMode
                ? "Best WR prop this week? Biggest role change?"
                : nflRamp
                  ? "Side, total, or pass on tonight's slate?"
                  : "Which RB leads TDs in 2026? Best future?"
            }
            btnColor="#4A90D9"
            {...askBarCommon}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(nflQuickPrompts.length
              ? nflQuickPrompts
              : nflSeasonMode
                ? ["Best WR props this week?", "Biggest usage jump?", "Best TD scorer angle?", "Which line is stale?"]
                : nflRamp
                  ? [
                      "Side, total, or pass tonight?",
                      "Any real number on this board?",
                      "Pass until inactives?",
                      "Which favorite is a trap?",
                    ]
                  : ["Best WR future?", "Top TE by volume?", "Fade or take Kelce?", "Best RB rushing future?"]
            ).map((q) => (
              <button key={q} className="quick-btn" onClick={() => submitNfl(q)} style={{ fontSize: 11 }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      {urDockedChat ? (
        <div className="ur-chat-scroll">
          <ChatThread {...chatThreadProps} variant="urChatDocked" />
          {nflBoardBelow}
          <UrChatDockScrollSpacer />
        </div>
      ) : (
        <>
          <ChatThread {...chatThreadProps} />
          {nflBoardBelow}
          <div className="page-spacer" />
        </>
      )}
    </main>
  );
}
