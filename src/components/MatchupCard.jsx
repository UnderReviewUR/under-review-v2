// Reusable matchup card tile
export default function MatchupCard({ m, onOpen, showCategory = false }) {
  return (
    <div className="matchup-card" onClick={() => onOpen(m)}>
      <div className="matchup-top">
        <div className="matchup-league" style={{ color: m.leagueColor }}>
          {showCategory ? (m.homeCategory || m.league) : m.league}
        </div>
        <div className="matchup-time">{m.time}</div>
      </div>
      <div className="matchup-body">
        <div className="matchup-title">{m.title}</div>
        <div className="matchup-meta">{m.network}</div>
        <div className="matchup-blurb">{m.blurb}</div>
      </div>
    </div>
  );
}
