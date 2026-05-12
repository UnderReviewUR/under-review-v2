import AskBar from "../components/AskBar.jsx";
import { ChatThread } from "../features/app/helpers.jsx";
import { getQuickPromptsForState } from "../lib/getQuickPromptsForState.js";
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
}) {
  const nflQuickPrompts = getQuickPromptsForState("nfl", nflSeasonMode);

  return (
          <main ref={nflScreenRef} className={`screen${hasDockedBar ? " has-msgs" : ""}`}>
            <div className="nfl-banner">
              <div className="banner-title">{nflSeasonMode?"NFL In-Season Board":"NFL Futures Board"}</div>
              <div className="banner-sub">{nflSeasonMode?"WEEKLY PROPS · USAGE · PLAYER ANGLES":"FUTURES · PLAYER STATS · BETTING ANGLES"}</div>
              <div className="banner-note">
                {nflSeasonMode?"Current weekly props, role changes, usage shifts, and market edges.":"Skill positions database with per-game stats, TD rates, prop floors and ceilings."}
                <span style={{marginLeft:8,fontFamily:"var(--mono-font)",fontSize:9,letterSpacing:1,color:"var(--muted)"}} title="Player database is hand-maintained — verify lines against your book">Est.</span>
              </div>
              <div style={{
                fontFamily: "var(--mono-font)",
                fontSize: 9,
                letterSpacing: 2,
                color: "var(--muted)",
                textTransform: "uppercase",
                marginTop: 6,
                padding: "0 20px",
              }}>
                Player props + live lines arriving with the 2026 season
              </div>
            </div>
            {nflMsgs.length===0&&(
              <div className="nfl-ask-shell" ref={nflBarRef}>
              <AskBar inputRef={nflInputRef} value={nflInput} onChange={setNflInput} onSubmit={()=>submitNfl()} placeholder={nflSeasonMode?"Best WR prop this week? Biggest role change?":"Which RB leads TDs in 2026? Best future?"} btnColor="#4A90D9" {...askBarCommon} />
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(nflQuickPrompts.length ? nflQuickPrompts : nflSeasonMode
                  ? ["Best WR props this week?", "Biggest usage jump?", "Best TD scorer angle?", "Which line is stale?"]
                  : ["Best WR future?", "Top TE by volume?", "Fade or take Kelce?", "Best RB rushing future?"]
                ).map((q) => (
                  <button key={q} className="quick-btn" onClick={() => submitNfl(q)} style={{ fontSize: 11 }}>
                    {q}
                  </button>
                ))}
              </div>
              </div>
            )}
            <ChatThread
              msgs={nflMsgs}
              urTakeTrackPlay={urTakeTrackPlay}
              accessTier={accessTier}
              onUrTakeFollowUpPick={onUrTakeFollowUpPick}
              onUpgradePromptClick={onUpgradePromptClick}
              hideFollowUpDock
            />
            <div className="section-divider">{nflSeasonMode?"Top Weekly Leans":"Top Future Leans"}</div>
            <NflPropGuideSection
              guide={NFL_PROP_GUIDE}
              onSelectProp={(prop) =>
                submitNfl(`Tell me about ${prop.player} ${prop.propType} prop — line is ${prop.line}`)
              }
            />
            <div className="section-divider">Player Database</div>
            <div className="pos-tabs">{NFL_POSITIONS.map(pos=><button key={pos} className={`pos-tab${nflPosFilter===pos?" active":""}`} onClick={()=>setNflPosFilter(pos)}>{pos}</button>)}</div>
            {filteredNflPlayers.map(([name,player])=><NflPlayerCard key={name} name={name} player={player} onOpen={openNflPlayer} />)}
            <div className="page-spacer"/>
          </main>
  );
}
