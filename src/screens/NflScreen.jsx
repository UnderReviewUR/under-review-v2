import { useMemo, useRef } from "react";
import AskBar from "../components/AskBar";
import ChatThread from "../components/ChatThread";
import NflPlayerCard from "../components/NflPlayerCard";
import { isNflInSeason } from "../lib/tennis";
import { NFL_PLAYERS, NFL_POSITIONS, NFL_PROP_GUIDE } from "../data/nflPlayers";

export default function NflScreen({
  nflMsgs, nflInput, setNflInput,
  nflPosFilter, setNflPosFilter,
  pastedImage, clearImage, isAsking, processImageFile, fileInputRef,
  onSubmitNfl, onOpenNflPlayer,
}) {
  const inputRef = useRef(null);
  const nflSeasonMode = useMemo(() => isNflInSeason(), []);

  const filteredPlayers = useMemo(() =>
    Object.entries(NFL_PLAYERS)
      .filter(([, p]) => nflPosFilter === "ALL" || p.pos === nflPosFilter)
      .sort((a, b) => b[1].ydsPg - a[1].ydsPg),
  [nflPosFilter]);

  return (
    <main className="screen">
      <div className="nfl-banner">
        <div className="banner-title">{nflSeasonMode ? "NFL In-Season Board" : "NFL Futures Board"}</div>
        <div className="banner-sub">{nflSeasonMode ? "WEEKLY PROPS · USAGE · PLAYER ANGLES" : "FUTURES · PLAYER STATS · BETTING ANGLES"}</div>
        <div className="banner-note">{nflSeasonMode ? "Current weekly props, role changes, usage shifts, and market edges." : "Skill positions database with per-game stats, TD rates, prop floors and ceilings."}</div>
      </div>

      <div className="nfl-ask-shell">
        <div className="nfl-ask-label">Ask Anything — NFL</div>
        <AskBar
          inputRef={inputRef} fileInputRef={fileInputRef}
          value={nflInput} onChange={setNflInput}
          onSubmit={() => onSubmitNfl()}
          placeholder={nflSeasonMode ? "Best WR prop this week? Biggest role change?" : "Which RB leads TDs in 2026? Best future?"}
          btnColor="var(--nfl)"
          pastedImage={pastedImage} clearImage={clearImage} isAsking={isAsking} processImageFile={processImageFile}
        />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {(nflSeasonMode
            ? ["Best WR props this week?","Biggest usage jump?","Best TD scorer angle?","Which line is stale?"]
            : ["Best WR future?","Top TE by volume?","Fade or take Kelce?","Best RB rushing future?"]
          ).map(q => <button key={q} className="quick-btn" onClick={() => onSubmitNfl(q)} style={{ fontSize:11 }}>{q}</button>)}
        </div>
      </div>

      <ChatThread msgs={nflMsgs} />

      <div className="section-divider">{nflSeasonMode ? "Top Weekly Leans" : "Top Future Leans"}</div>

      {NFL_PROP_GUIDE.map(prop => (
        <div key={`${prop.player}-${prop.propType}`} className="nfl-prop-card"
          onClick={() => onSubmitNfl(`Tell me about ${prop.player} ${prop.propType} prop — line is ${prop.line}`)}>
          <div className="nfl-prop-top">
            <div className="nfl-prop-player">{prop.player}</div>
            <div className="nfl-prop-type">{prop.propType}</div>
          </div>
          <div className="nfl-prop-line">Line: {prop.line} · Floor {prop.floor} / Ceil {prop.ceil}</div>
          <div className={`nfl-prop-lean ${prop.leanClass}`}>{prop.lean}</div>
        </div>
      ))}

      <div className="section-divider">Player Database</div>

      <div className="pos-tabs">
        {NFL_POSITIONS.map(pos => (
          <button key={pos} className={`pos-tab${nflPosFilter === pos ? " active" : ""}`} onClick={() => setNflPosFilter(pos)}>{pos}</button>
        ))}
      </div>

      {filteredPlayers.map(([name, player]) => (
        <NflPlayerCard key={name} name={name} player={player} onOpen={onOpenNflPlayer} />
      ))}
      <div className="page-spacer" />
    </main>
  );
}
