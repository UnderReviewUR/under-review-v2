import { useEffect, useState } from "react";
import { getWcTeamByAbbr } from "../../data/wc2026Teams.js";
import { formatMatchOdds } from "../../data/wc2026WinProbability.js";
import { findStadiumByCity } from "../../data/wc2026Stadiums.js";
import WcLiveScore from "./WcLiveScore.jsx";

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

export default function WcMatchCard({ match, teams, onAskUrTake, showOdds = true, fetchWeather = false }) {
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

  const kickoff = [match?.date, match?.time].filter(Boolean).join(" ");

  return (
    <div className="wc-match-card">
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
      {onAskUrTake ? (
        <button type="button" className="wc-ask-btn" onClick={() => onAskUrTake(match)}>
          Ask UR Take →
        </button>
      ) : null}
    </div>
  );
}
