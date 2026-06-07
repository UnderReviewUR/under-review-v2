import { useEffect, useState } from "react";
import { formatOddsAmerican } from "../../shared/formatOddsAmerican.js";

/**
 * TNNS-style book comparison: market average + 3–4 US books with provider names.
 *
 * @param {{
 *   sportKey?: string,
 *   eventId?: string,
 *   home?: string,
 *   away?: string,
 *   homeAbbr?: string,
 *   awayAbbr?: string,
 *   homeLabel?: string,
 *   awayLabel?: string,
 *   showDraw?: boolean,
 *   espnFallback?: { provider?: string, home?: string, away?: string, draw?: string } | null,
 *   compact?: boolean,
 *   /** When false, skip Odds API — show ESPN / espnFallback only (WC slate). */
 *   fetchMultiBook?: boolean,
 * }} props
 */
export default function BookmakerOddsPanel({
  sportKey,
  eventId,
  home,
  away,
  homeAbbr,
  awayAbbr,
  homeLabel,
  awayLabel,
  showDraw = false,
  espnFallback = null,
  compact = false,
  fetchMultiBook = true,
}) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);

  const homeDisplay = homeLabel || homeAbbr || home || "Home";
  const awayDisplay = awayLabel || awayAbbr || away || "Away";

  const canFetchApi =
    fetchMultiBook &&
    !!sportKey &&
    (!!eventId || (!!(home || homeAbbr) && !!(away || awayAbbr)));

  useEffect(() => {
    if (!canFetchApi) {
      setPayload(null);
      setLoading(false);
      return undefined;
    }

    let cancel = false;
    setLoading(true);

    const qs = new URLSearchParams();
    qs.set("sportKey", sportKey);
    if (eventId) qs.set("eventId", eventId);
    if (home) qs.set("home", home);
    if (away) qs.set("away", away);
    if (homeAbbr) qs.set("homeAbbr", homeAbbr);
    if (awayAbbr) qs.set("awayAbbr", awayAbbr);

    fetch(`/api/match-book-odds?${qs}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancel) setPayload(d);
      })
      .catch(() => {
        if (!cancel) setPayload(null);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [sportKey, eventId, home, away, homeAbbr, awayAbbr, canFetchApi]);

  const books = payload?.ok && Array.isArray(payload.books) ? payload.books : [];
  const marketAvg = payload?.ok ? payload.marketAverage : null;
  const hasDraw = showDraw || payload?.hasDraw || !!espnFallback?.draw;

  const espnProvider = String(espnFallback?.provider || "ESPN").trim();
  const espnHome = espnFallback?.home?.moneyline ?? espnFallback?.home;
  const espnAway = espnFallback?.away?.moneyline ?? espnFallback?.away;
  const espnDraw = espnFallback?.draw?.moneyline ?? espnFallback?.draw;
  const hasEspn = !!(espnHome || espnAway || espnDraw);

  if (!canFetchApi && !hasEspn) return null;
  if (canFetchApi && loading && !books.length && !hasEspn) {
    return (
      <div className={`book-odds-panel${compact ? " book-odds-panel--compact" : ""}`}>
        <div className="book-odds-label">Markets</div>
        <div className="book-odds-muted">Loading book lines…</div>
      </div>
    );
  }

  if (!books.length && !hasEspn) return null;

  const renderCell = (val) => {
    if (!val) return <span className="book-odds-dash">—</span>;
    return <span>{formatOddsAmerican(val)}</span>;
  };

  return (
    <div
      className={`book-odds-panel${compact ? " book-odds-panel--compact" : ""}`}
      aria-label="Match betting odds by sportsbook"
    >
      <div className="book-odds-label">Markets</div>

      {marketAvg && books.length > 1 ? (
        <div className="book-odds-avg-row">
          <span className="book-odds-book-col book-odds-avg-label">Market avg</span>
          <span className="book-odds-ml-col" title={homeDisplay}>
            {renderCell(marketAvg.home)}
          </span>
          {hasDraw ? (
            <span className="book-odds-ml-col book-odds-draw-col">Draw {renderCell(marketAvg.draw)}</span>
          ) : null}
          <span className="book-odds-ml-col" title={awayDisplay}>
            {renderCell(marketAvg.away)}
          </span>
        </div>
      ) : null}

      <div className="book-odds-table">
        <div className="book-odds-head">
          <span className="book-odds-book-col">Book</span>
          <span className="book-odds-ml-col">{homeDisplay}</span>
          {hasDraw ? <span className="book-odds-ml-col book-odds-draw-col">Draw</span> : null}
          <span className="book-odds-ml-col">{awayDisplay}</span>
        </div>

        {books.map((row) => (
          <div key={row.key} className="book-odds-row">
            <span className="book-odds-book-col book-odds-book-name">{row.label}</span>
            <span className="book-odds-ml-col">{renderCell(row.home)}</span>
            {hasDraw ? <span className="book-odds-ml-col">{renderCell(row.draw)}</span> : null}
            <span className="book-odds-ml-col">{renderCell(row.away)}</span>
          </div>
        ))}

        {hasEspn && !books.some((b) => /espn/i.test(b.key)) ? (
          <div className="book-odds-row book-odds-row--espn">
            <span className="book-odds-book-col book-odds-book-name">{espnProvider}</span>
            <span className="book-odds-ml-col">{renderCell(espnHome)}</span>
            {hasDraw ? <span className="book-odds-ml-col">{renderCell(espnDraw)}</span> : null}
            <span className="book-odds-ml-col">{renderCell(espnAway)}</span>
          </div>
        ) : null}
      </div>

      {books.length ? (
        <div className="book-odds-foot">
          {books.length} book{books.length === 1 ? "" : "s"} · US lines
        </div>
      ) : null}
    </div>
  );
}
