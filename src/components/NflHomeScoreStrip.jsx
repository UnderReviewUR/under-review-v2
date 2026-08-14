import { useMemo } from "react";

import { buildNflHomeScoreRows } from "../../shared/nflGameState.js";

/**
 * Home NFL scores: upcoming = matchup + time + channel; live = matchup + score + quarter.
 */
export default function NflHomeScoreStrip({
  games = [],
  onSelectRow = null,
  nowMs = null,
}) {
  const rows = useMemo(
    () => buildNflHomeScoreRows(games, nowMs != null ? { nowMs } : {}),
    [games, nowMs],
  );
  if (!rows.length) return null;

  const clickable = typeof onSelectRow === "function";
  const liveCount = rows.filter((r) => r.phase === "live").length;
  const kicker = liveCount
    ? "NFL · Live"
    : rows.every((r) => r.phase === "final")
      ? "NFL · Final"
      : "NFL · Upcoming";

  return (
    <section className="nfl-home-scores" aria-label="NFL scores">
      <div className="nfl-home-scores__kicker">{kicker}</div>
      <ul className="nfl-home-scores__list">
        {rows.map((row) => {
          const Tag = clickable ? "button" : "div";
          return (
            <li key={row.key}>
              <Tag
                type={clickable ? "button" : undefined}
                className={`nfl-home-scores__row nfl-home-scores__row--${row.phase}${clickable ? " nfl-home-scores__row--btn" : ""}`}
                aria-label={`${row.matchup}${row.meta ? `, ${row.meta}` : ""}`}
                onClick={clickable ? () => onSelectRow(row) : undefined}
              >
                {row.phase === "live" ? (
                  <span className="nfl-home-scores__live" aria-hidden>
                    Live
                  </span>
                ) : (
                  <span className="nfl-home-scores__phase" aria-hidden />
                )}
                <span className="nfl-home-scores__matchup">{row.matchup}</span>
                <span className="nfl-home-scores__meta">{row.meta}</span>
              </Tag>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
