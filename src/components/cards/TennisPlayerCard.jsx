import {
  getDrValue,
  getHoldValue,
  getTbValue,
} from "../../features/app/helpers.jsx";

export function TennisPlayerCard({ name, idx, tour, players, onOpen }) {
  const p =
    (tour === "atp" ? players?.atp : players?.wta)?.[name] || null;
  if (!p) return null;
  return (
    <div className="player-card" onClick={() => onOpen(name)}>
      <div className="player-top">
        <div className="player-rank">#{idx + 1}</div>
        <div className="player-info">
          <div className="player-name">{name}</div>
          <div className="player-style">
            {Array.isArray(p.style)
              ? p.style.join(", ").replaceAll("_", " ")
              : p.style}
          </div>
          <div className="surface-pills">
            {p.surfaceNote?.hard && (
              <span className="surface-pill surface-hard">HARD</span>
            )}
            {p.surfaceNote?.clay && (
              <span className="surface-pill surface-clay">CLAY</span>
            )}
            {p.surfaceNote?.grass && (
              <span className="surface-pill surface-grass">GRASS</span>
            )}
          </div>
        </div>
        <div className="player-elo">
          <span className="player-elo-num">{p.elo}</span>
          <span className="player-elo-label">ELO</span>
          {p.record2026 && (
            <div className="form-badge" style={{ marginTop: 4 }}>
              2026
            </div>
          )}
        </div>
      </div>
      <div className="player-stats">
        <div className="pstat">
          <div className="pstat-label">HOLD</div>
          <div className="pstat-value">{getHoldValue(p)}</div>
        </div>
        <div className="pstat">
          <div className="pstat-label">DR</div>
          <div
            className="pstat-value"
            style={{ color: "var(--cyan-bright)" }}
          >
            {getDrValue(p)}
          </div>
        </div>
        <div className="pstat">
          <div className="pstat-label">TB%</div>
          <div className="pstat-value">{getTbValue(p)}</div>
        </div>
      </div>
    </div>
  );
}
