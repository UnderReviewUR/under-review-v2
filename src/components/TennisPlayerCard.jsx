import { getHoldValue, getDrValue, getTbValue } from "../lib/tennis";

export default function TennisPlayerCard({ name, idx, player, onOpen }) {
  if (!player) return null;
  return (
    <div className="player-card" onClick={() => onOpen(name)}>
      <div className="player-top">
        <div className="player-rank">#{idx + 1}</div>
        <div className="player-info">
          <div className="player-name">{name}</div>
          <div className="player-style">
            {Array.isArray(player.style) ? player.style.join(", ").replaceAll("_", " ") : player.style}
          </div>
          <div className="surface-pills">
            {player.surfaceNote?.hard && <span className="surface-pill surface-hard">HARD</span>}
            {player.surfaceNote?.clay && <span className="surface-pill surface-clay">CLAY</span>}
            {player.surfaceNote?.grass && <span className="surface-pill surface-grass">GRASS</span>}
          </div>
        </div>
        <div className="player-elo">
          <span className="player-elo-num">{player.elo}</span>
          <span className="player-elo-label">ELO</span>
          {player.record2026 && <div className="form-badge" style={{ marginTop: 4 }}>2026</div>}
        </div>
      </div>
      <div className="player-stats">
        <div className="pstat"><div className="pstat-label">HOLD</div><div className="pstat-value">{getHoldValue(player)}</div></div>
        <div className="pstat"><div className="pstat-label">DR</div><div className="pstat-value" style={{ color: "var(--cyan-bright)" }}>{getDrValue(player)}</div></div>
        <div className="pstat"><div className="pstat-label">TB%</div><div className="pstat-value">{getTbValue(player)}</div></div>
      </div>
    </div>
  );
}
