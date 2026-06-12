import { useEffect, useState } from "react";
import { getWcTeamByAbbr } from "../../data/wc2026Teams.js";
import { resolveMatchWinProbabilityBar } from "../../../shared/wcMatchMoneylineProbs.js";
import { findStadiumByCity } from "../../data/wc2026Stadiums.js";
import BookmakerOddsPanel from "../BookmakerOddsPanel.jsx";
import { formatWcKickoffDisplay } from "../../../shared/wcKickoffDisplay.js";
import WcLiveScore from "./WcLiveScore.jsx";
import {
  formatWcMatchGroupLetter,
  formatWcMatchVenueLine,
} from "../../../shared/wcMatchFieldDisplay.js";

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
      {odds.sourceLabel ? (
        <p className="wc-detail-model-odds__label wc-odds-source-label">{odds.sourceLabel}</p>
      ) : null}
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
  const live = isLive(match?.status);
  const finished = String(match?.status || "").toLowerCase() === "ft";
  const showPreMatchOdds = showOdds && !live && !finished;
  const odds =
    showPreMatchOdds && teams?.length
      ? resolveMatchWinProbabilityBar({
          homeAbbr: match.homeTeam,
          awayAbbr: match.awayTeam,
          teams,
          matchOdds: match?.odds,
          oddsStale: match?.oddsStale === true,
        })
      : null;

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
  const groupLetter = formatWcMatchGroupLetter(match?.group);
  const venueLine = formatWcMatchVenueLine(match?.stadium, match?.city);
  const bookOdds = match?.odds;
  const homeTeam = getWcTeamByAbbr(match?.homeTeam);
  const awayTeam = getWcTeamByAbbr(match?.awayTeam);

  const cardId = match?.id != null ? `wc-match-${String(match.id).trim()}` : undefined;

  return (
    <div
      id={cardId}
      className={`wc-match-card${highlight ? " wc-match-card--highlight" : ""}`}
    >
      {live ? (
        <WcLiveScore match={match} />
      ) : (
        <div
          className={`wc-match-teams${onViewDetails ? " wc-match-teams--clickable" : ""}`}
          onClick={onViewDetails ? () => onViewDetails(match) : undefined}
          onKeyDown={
            onViewDetails
              ? (e) => {
                  if (e.key === "Enter") onViewDetails(match);
                }
              : undefined
          }
          role={onViewDetails ? "button" : undefined}
          tabIndex={onViewDetails ? 0 : undefined}
        >
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
        {groupLetter ? <span>Group {groupLetter}</span> : null}
        {venueLine ? (
          <span>
            {weather?.icon ? `${weather.icon} ` : ""}
            {venueLine}
            {weather?.tempF != null ? ` · ${weather.tempF}°F` : ""}
          </span>
        ) : null}
      </div>
      {showPreMatchOdds ? <OddsBar odds={odds} /> : null}
      {showPreMatchOdds ? (
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
        {onAskUrTake ? (
          <button type="button" className="wc-ask-btn" onClick={() => onAskUrTake(match)}>
            Ask UR Take →
          </button>
        ) : null}
      </div>
    </div>
  );
}
