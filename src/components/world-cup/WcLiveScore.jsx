import { getWcTeamByAbbr } from "../../data/wc2026Teams.js";

export default function WcLiveScore({ match }) {
  if (!match) return null;
  const home = getWcTeamByAbbr(match.homeTeam);
  const away = getWcTeamByAbbr(match.awayTeam);
  const minute =
    match.status === "HT"
      ? "HT"
      : match.minute
        ? `${match.minute}'`
        : "LIVE";

  return (
    <div className="wc-live-score">
      <div className="wc-live-row">
        <div className="wc-live-side">
          {home?.flagUrl ? (
            <img src={home.flagUrl} alt="" width={32} height={22} loading="lazy" className="wc-flag-sm" />
          ) : null}
          <span>{home?.name || match.homeTeam}</span>
        </div>
        <div className="wc-live-mid">
          <span className="wc-live-score-num">
            {match.homeScore ?? 0} – {match.awayScore ?? 0}
          </span>
          <span className="wc-live-badge">
            <span className="wc-live-dot" />
            {minute}
          </span>
        </div>
        <div className="wc-live-side wc-live-side-away">
          {away?.flagUrl ? (
            <img src={away.flagUrl} alt="" width={32} height={22} loading="lazy" className="wc-flag-sm" />
          ) : null}
          <span>{away?.name || match.awayTeam}</span>
        </div>
      </div>
    </div>
  );
}
