function formatAmericanOdds(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  return v > 0 ? `+${v}` : String(v);
}

/**
 * @param {{ line?: number, overOdds?: number, underOdds?: number, book?: string } | null | undefined} market
 */
function PropMarketRow({ label, market }) {
  if (!market?.line) return null;
  const over = formatAmericanOdds(market.overOdds);
  const under = formatAmericanOdds(market.underOdds);
  return (
    <div className="nba-player-prop-row">
      <span className="nba-player-prop-label">{label}</span>
      <span className="nba-player-prop-line">
        {market.line} <span className="nba-player-prop-ou">O {over}</span>
        {under ? <span className="nba-player-prop-ou"> / U {under}</span> : null}
      </span>
    </div>
  );
}

export function NbaPlayerCard({ chip, fullName, teamAbbr, statRow, onAsk }) {
  const consensus = statRow?.consensusProps;
  const markets = consensus?.markets || {};
  const hasLines = Boolean(markets.points || markets.rebounds || markets.assists);
  const stale = Boolean(consensus?.oddsStale);
  const freshnessLabel = String(consensus?.freshnessLabel || "").trim();
  const book =
    markets.points?.book ||
    markets.rebounds?.book ||
    markets.assists?.book ||
    consensus?.primaryBookLabel ||
    "DraftKings";

  return (
    <div
      className={`nba-player-card${stale ? " nba-player-card--stale" : ""}`}
      onClick={() => onAsk?.(`Best prop angle for ${fullName || chip} tonight? PRA line, floor, ceiling, and lean.`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAsk?.(`Best prop angle for ${fullName || chip} tonight? PRA line, floor, ceiling, and lean.`);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="nba-player-card-top">
        <div>
          <div className="nba-player-card-name">{chip || fullName}</div>
          <div className="nba-player-card-meta">
            {teamAbbr}
            {statRow?.pts != null ? ` · ${statRow.pts} PPG` : ""}
          </div>
        </div>
        {hasLines ? (
          <div className="nba-player-card-book">{book}</div>
        ) : (
          <div className="nba-player-card-book nba-player-card-book--muted">Lines loading</div>
        )}
      </div>

      {hasLines ? (
        <div className="nba-player-card-props">
          <PropMarketRow label="PTS" market={markets.points} />
          <PropMarketRow label="REB" market={markets.rebounds} />
          <PropMarketRow label="AST" market={markets.assists} />
        </div>
      ) : null}

      {freshnessLabel ? (
        <div className="nba-player-card-freshness">{freshnessLabel}</div>
      ) : null}
    </div>
  );
}
