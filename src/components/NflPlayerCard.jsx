// NFL player card (for the ranked list in the NFL screen)
export default function NflPlayerCard({ name, player, onOpen }) {
  return (
    <div className="nfl-player-card" onClick={() => onOpen(name)}>
      <div className="nfl-player-top">
        <div className="nfl-player-left">
          <div className="nfl-rank">{player.pos}</div>
          <div className="nfl-player-info">
            <div className="nfl-player-name">{name}</div>
            <div className="nfl-player-meta">{player.team} · {player.tier}</div>
          </div>
        </div>
        <div className="nfl-player-right">
          <span className="nfl-yds-pg">{player.ydsPg}</span>
          <span className="nfl-yds-label">YDS/G</span>
        </div>
      </div>
      <div className="nfl-player-stats">
        <div className="nfl-stat">
          <div className="nfl-stat-label">GAMES</div>
          <div className="nfl-stat-value">{player.rec2025.g}</div>
        </div>
        <div className="nfl-stat">
          <div className="nfl-stat-label">TDs</div>
          <div className="nfl-stat-value" style={{ color: "var(--nfl)" }}>{player.rec2025.td}</div>
        </div>
        {player.rec2025.tgt ? (
          <div className="nfl-stat">
            <div className="nfl-stat-label">TGT</div>
            <div className="nfl-stat-value">{player.rec2025.tgt}</div>
          </div>
        ) : (
          <div className="nfl-stat">
            <div className="nfl-stat-label">REC/G</div>
            <div className="nfl-stat-value">{player.rec2025.recPg ?? "—"}</div>
          </div>
        )}
        <div className="nfl-stat">
          <div className="nfl-stat-label">YPR</div>
          <div className="nfl-stat-value">{player.rec2025.ypr}</div>
        </div>
      </div>
    </div>
  );
}
