import { getWcTeamByAbbr } from "../data/wc2026Teams.js";
import { formatWcKickoffDisplay } from "../../shared/wcKickoffDisplay.js";
import { isWcLiveMatchStatus } from "../../shared/wcFeaturedMatch.js";

function liveMinute(match) {
  const status = String(match?.status || "").toLowerCase();
  if (status === "ht") return "HT";
  if (match?.minute != null && String(match.minute).trim() !== "") {
    return `${match.minute}'`;
  }
  return "LIVE";
}

function fixtureAskPrompt(match) {
  const away = match?.awayTeam || "Away";
  const home = match?.homeTeam || "Home";
  if (isWcLiveMatchStatus(match?.status)) {
    return `Best live angle in ${away} vs ${home} right now — one direct play.`;
  }
  return `Who wins ${away} vs ${home}? Give me the sharpest pre-match lean with the line.`;
}

/**
 * Compact cream WC fixture list for home spotlight row.
 */
export default function HomeWcCompactCard({
  title = "World Cup",
  fixtures = [],
  onOpenHub,
  onOpenMatch,
  onAskFixture,
}) {
  if (!fixtures.length) return null;

  return (
    <section className="home-wc-compact-card" aria-label={title}>
      <div className="home-wc-compact-card__head">
        <span className="home-wc-compact-card__kicker">{title}</span>
        {onOpenHub ? (
          <button type="button" className="home-wc-compact-card__hub" onClick={onOpenHub}>
            Hub →
          </button>
        ) : null}
      </div>
      <ul className="home-wc-compact-card__list">
        {fixtures.map((match) => {
          const home = getWcTeamByAbbr(match.homeTeam);
          const away = getWcTeamByAbbr(match.awayTeam);
          const live = isWcLiveMatchStatus(match.status);
          const hasScore =
            match.homeScore != null &&
            match.awayScore != null &&
            (live || String(match.status || "").toLowerCase() === "ft");
          const kickoff = formatWcKickoffDisplay(match);
          const id = match?.id != null ? String(match.id) : "";

          return (
            <li key={id || `${match.awayTeam}-${match.homeTeam}`}>
              <button
                type="button"
                className="home-wc-compact-card__row"
                onClick={() => onOpenMatch?.(match)}
              >
                <div className="home-wc-compact-card__teams">
                  <div className="home-wc-compact-card__team">
                    {away?.flagUrl ? (
                      <img src={away.flagUrl} alt="" width={22} height={22} className="home-wc-compact-card__flag" />
                    ) : null}
                    <span className="home-wc-compact-card__abbr">{match.awayTeam}</span>
                  </div>
                  <span className="home-wc-compact-card__vs">vs</span>
                  <div className="home-wc-compact-card__team">
                    {home?.flagUrl ? (
                      <img src={home.flagUrl} alt="" width={22} height={22} className="home-wc-compact-card__flag" />
                    ) : null}
                    <span className="home-wc-compact-card__abbr">{match.homeTeam}</span>
                  </div>
                </div>
                <div className="home-wc-compact-card__meta">
                  {hasScore ? (
                    <span className="home-wc-compact-card__score">
                      {match.awayScore}–{match.homeScore}
                      {live ? ` · ${liveMinute(match)}` : ""}
                    </span>
                  ) : (
                    <span className="home-wc-compact-card__time">{kickoff || "Today"}</span>
                  )}
                </div>
              </button>
              {onAskFixture ? (
                <button
                  type="button"
                  className="home-wc-compact-card__ask"
                  onClick={() => onAskFixture(fixtureAskPrompt(match), match)}
                >
                  Ask →
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
