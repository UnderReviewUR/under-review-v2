import { useEffect, useId, useState } from "react";
import { getWcTeamByAbbr } from "../../data/wc2026Teams.js";
import { formatMatchOdds } from "../../data/wc2026WinProbability.js";
import { findStadiumByCity } from "../../data/wc2026Stadiums.js";
import BookmakerOddsPanel from "../BookmakerOddsPanel.jsx";
import { formatWcKickoffDisplay } from "../../../shared/wcKickoffDisplay.js";
import {
  WC_XI_STATUS_ICON,
  formatWcDetailAsOfEt,
  resolveWcXiStatus,
  wcXiStatusChipLabel,
} from "../../../shared/wcXiStatus.js";
import WcLiveScore from "./WcLiveScore.jsx";

const WC_XI_HELP =
  "ESPN lineup data refreshes every 90s near kickoff. Don't place starter props until this shows green.";

function WcMatchXiTrust({ match }) {
  const xiStatus = resolveWcXiStatus(match);
  const asOf = formatWcDetailAsOfEt(match?.lastUpdated);
  const popoverId = useId();
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div className="wc-xi-trust">
      <span className={`wc-xi-chip wc-xi-chip--${xiStatus}`}>
        <span className="wc-xi-chip-icon" aria-hidden>
          {WC_XI_STATUS_ICON[xiStatus]}
        </span>
        {wcXiStatusChipLabel(xiStatus)}
        <button
          type="button"
          className="wc-xi-help-btn"
          aria-label="Why is lineup status pending?"
          aria-expanded={helpOpen}
          aria-controls={popoverId}
          onClick={() => setHelpOpen((o) => !o)}
        >
          ?
        </button>
      </span>
      {helpOpen ? (
        <p id={popoverId} className="wc-xi-help-popover" role="tooltip">
          {WC_XI_HELP}
        </p>
      ) : null}
      {asOf ? <span className="wc-xi-asof">as of {asOf}</span> : null}
    </div>
  );
}

function isLive(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function OddsBar({ odds }) {
  if (!odds) return null;
  const total = odds.teamA.winPct + odds.draw + odds.teamB.winPct || 1;
  const aW = (odds.teamA.winPct / total) * 100;
  const dW = (odds.draw / total) * 100;
  const bW = (odds.teamB.winPct / total) * 100;
  return (
    <div className="wc-odds-wrap">
      <div className="wc-odds-labels">
        <span>
          {odds.teamA.abbr} {odds.teamA.winPct}%
        </span>
        <span>Draw {odds.draw}%</span>
        <span>
          {odds.teamB.abbr} {odds.teamB.winPct}%
        </span>
      </div>
      <div className="wc-odds-bar">
        <span style={{ width: `${aW}%`, background: "var(--wc-blue)" }} />
        <span style={{ width: `${dW}%`, background: "var(--muted)" }} />
        <span style={{ width: `${bW}%`, background: "var(--wc-gold)" }} />
      </div>
    </div>
  );
}

export default function WcMatchCard({
  match,
  teams,
  onAskUrTake,
  onViewDetails,
  showOdds = true,
  fetchWeather = false,
  highlight = false,
}) {
  const [weather, setWeather] = useState(null);
  const home = getWcTeamByAbbr(match?.homeTeam) || teams?.find((t) => t.abbreviation === match?.homeTeam);
  const away = getWcTeamByAbbr(match?.awayTeam) || teams?.find((t) => t.abbreviation === match?.awayTeam);
  const odds = showOdds && teams?.length ? formatMatchOdds(match.homeTeam, match.awayTeam, teams) : null;
  const live = isLive(match?.status);
  const finished = String(match?.status || "").toLowerCase() === "ft";

  useEffect(() => {
    if (!fetchWeather) return;
    const stadium = findStadiumByCity(match?.city) || findStadiumByCity(match?.stadium);
    if (!stadium) return;
    let cancel = false;
    const qs = new URLSearchParams({
      city: stadium.city,
      lat: String(stadium.lat),
      lon: String(stadium.lon),
    });
    fetch(`/api/world-cup-weather?${qs}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancel && d) setWeather(d);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [fetchWeather, match?.city, match?.stadium]);

  const kickoff = formatWcKickoffDisplay(match);
  const bookOdds = match?.odds;
  const homeTeam = getWcTeamByAbbr(match?.homeTeam);
  const awayTeam = getWcTeamByAbbr(match?.awayTeam);

  const cardId = match?.id != null ? `wc-match-${String(match.id).trim()}` : undefined;

  return (
    <div
      id={cardId}
      className={`wc-match-card${highlight ? " wc-match-card--highlight" : ""}`}
    >
      <WcMatchXiTrust match={match} />
      {live ? (
        <WcLiveScore match={match} />
      ) : (
        <div className="wc-match-teams">
          <div className="wc-match-team">
            {home?.flagUrl ? (
              <img src={home.flagUrl} alt="" width={32} height={22} loading="lazy" className="wc-flag-sm" />
            ) : null}
            <span>{home?.name || match.homeTeam}</span>
          </div>
          <div className="wc-match-vs">
            {finished ? (
              <span className="wc-match-score">
                {match.homeScore ?? 0} – {match.awayScore ?? 0}
              </span>
            ) : (
              "vs"
            )}
          </div>
          <div className="wc-match-team">
            {away?.flagUrl ? (
              <img src={away.flagUrl} alt="" width={32} height={22} loading="lazy" className="wc-flag-sm" />
            ) : null}
            <span>{away?.name || match.awayTeam}</span>
          </div>
        </div>
      )}
      <div className="wc-match-meta">
        {kickoff ? <span>{kickoff}</span> : null}
        {match?.group ? <span>Group {match.group}</span> : null}
        {(match?.stadium || match?.city) && (
          <span>
            {weather?.icon ? `${weather.icon} ` : ""}
            {match.stadium || match.city}
            {weather?.tempF != null ? ` · ${weather.tempF}°F` : ""}
          </span>
        )}
      </div>
      {!live && showOdds ? <OddsBar odds={odds} /> : null}
      {!live && showOdds ? (
        <BookmakerOddsPanel
          compact
          fetchMultiBook={false}
          sportKey="soccer_fifa_world_cup"
          home={homeTeam?.name}
          away={awayTeam?.name}
          homeAbbr={match?.homeTeam}
          awayAbbr={match?.awayTeam}
          homeLabel={match?.homeTeam}
          awayLabel={match?.awayTeam}
          showDraw
          espnFallback={bookOdds}
        />
      ) : null}
      <div className="wc-match-actions">
        {onViewDetails ? (
          <button type="button" className="wc-detail-btn" onClick={() => onViewDetails(match)}>
            Match intel
          </button>
        ) : null}
        {onAskUrTake ? (
          <button type="button" className="wc-ask-btn" onClick={() => onAskUrTake(match)}>
            Ask UR Take →
          </button>
        ) : null}
      </div>
    </div>
  );
}
