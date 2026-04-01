import { useRef } from "react";
import AskBar from "../components/AskBar";
import { NFL_PLAYERS } from "../data/nflPlayers";

export default function NflPlayerScreen({
  selectedNflPlayerName,
  nflInput,
  setNflInput,
  pastedImage,
  clearImage,
  isAsking,
  processImageFile,
  fileInputRef,
  onSubmitNfl,
  onBack,
}) {
  const inputRef = useRef(null);
  const p = NFL_PLAYERS[selectedNflPlayerName];
  if (!p) return null;

  return (
    <main className="screen">
      <button className="detail-back" onClick={onBack}>← BACK</button>

      <div className="detail-card">
        <div className="nfl-detail-head">
          <div className="nfl-detail-pos">{p.pos} · {p.team} · {p.tier}</div>
          <div className="nfl-detail-name">{selectedNflPlayerName}</div>
          <div className="nfl-detail-sub">{p.ydsPg} yds/g · {p.rec2025.g} games played</div>
        </div>

        <div className="nfl-detail-grid">
          <div className="nfl-detail-stat"><div className="nfl-detail-label">YDS/G</div><div className="nfl-detail-value" style={{ color: "var(--nfl)" }}>{p.ydsPg}</div></div>
          <div className="nfl-detail-stat"><div className="nfl-detail-label">TDs</div><div className="nfl-detail-value" style={{ color: "var(--gold)" }}>{p.rec2025.td}</div></div>
          <div className="nfl-detail-stat"><div className="nfl-detail-label">YPR</div><div className="nfl-detail-value">{p.rec2025.ypr}</div></div>
          {p.rec2025.tgt && <div className="nfl-detail-stat"><div className="nfl-detail-label">TARGETS</div><div className="nfl-detail-value">{p.rec2025.tgt}</div></div>}
          {p.rec2025.recPg && <div className="nfl-detail-stat"><div className="nfl-detail-label">REC/G</div><div className="nfl-detail-value">{p.rec2025.recPg}</div></div>}
          <div className="nfl-detail-stat"><div className="nfl-detail-label">GAMES</div><div className="nfl-detail-value">{p.rec2025.g}</div></div>
        </div>

        <div className="nfl-detail-section">
          <div className="nfl-detail-section-label">Prop Breakdown</div>
          <div className="nfl-prop-block">
            {p.props.recYds && (
              <>
                <div className="nfl-prop-row"><span className="nfl-prop-name">REC YDS</span><span className="nfl-prop-val" style={{ color: "var(--muted)" }}>Floor {p.props.recYds.floor} / Ceil {p.props.recYds.ceil}</span></div>
                <div className="nfl-prop-row"><span className="nfl-prop-name">LEAN</span><span className={`nfl-prop-val ${p.props.recYds.lean?.includes("OVER") ? "lean-over" : "lean-neutral"}`}>{p.props.recYds.lean}</span></div>
              </>
            )}
            {p.props.rec && <div className="nfl-prop-row"><span className="nfl-prop-name">CATCHES</span><span className={`nfl-prop-val ${p.props.rec.lean?.includes("OVER") ? "lean-over" : "lean-neutral"}`}>{p.props.rec.lean}</span></div>}
            {p.props.td && <div className="nfl-prop-row"><span className="nfl-prop-name">TD SCORER</span><span className={`nfl-prop-val ${p.props.td.lean?.includes("OVER") ? "lean-over" : p.props.td.lean?.includes("FADE") ? "lean-fade" : "lean-neutral"}`}>{p.props.td.lean}</span></div>}
          </div>
        </div>

        <div className="nfl-detail-section">
          <div className="nfl-detail-section-label">Situation</div>
          <div className="nfl-situation">{p.situation}</div>
        </div>

        <div className="nfl-detail-section">
          <div className="nfl-detail-section-label">Betting Angles</div>
          <div className="nfl-betting-angles">
            {p.bettingAngles.map((angle, i) => (
              <div key={i} className="nfl-angle-item">
                <div className="nfl-angle-dot" />
                <div>{angle}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AskBar
        inputRef={inputRef}
        fileInputRef={fileInputRef}
        value={nflInput}
        onChange={setNflInput}
        onSubmit={() => onSubmitNfl()}
        placeholder={`Ask about ${selectedNflPlayerName}...`}
        btnColor="var(--nfl)"
        pastedImage={pastedImage}
        clearImage={clearImage}
        isAsking={isAsking}
        processImageFile={processImageFile}
      />
    </main>
  );
}
