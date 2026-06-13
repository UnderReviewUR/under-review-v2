import { useEffect, useState } from "react";
import { getWcTeamByAbbr } from "../../data/wc2026Teams.js";
import { findStadiumByCity } from "../../data/wc2026Stadiums.js";
import BookmakerOddsPanel from "../BookmakerOddsPanel.jsx";
import { formatWcKickoffDisplay } from "../../../shared/wcKickoffDisplay.js";
import { resolveWcXiStatus, wcXiStatusChipLabel } from "../../../shared/wcXiStatus.js";
import WcLiveScore from "./WcLiveScore.jsx";
import WcMatchReadCard from "./WcMatchReadCard.jsx";
import {
  formatWcMatchGroupLetter,
  formatWcMatchVenueLine,
} from "../../../shared/wcMatchFieldDisplay.js";

function isLive(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

export default function WcMatchCard({
  match,
  teams,
  mispriceContext = null,
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
  const showIntel = showOdds && teams?.length;

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
  const xiStatus = resolveWcXiStatus(match);
  const xiChip = !live && !finished ? wcXiStatusChipLabel(xiStatus) : "";
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
        {xiChip ? <span className="wc-match-xi-chip">{xiChip}</span> : null}
        {groupLetter ? <span>Group {groupLetter}</span> : null}
        {venueLine ? (
          <span>
            {weather?.icon ? `${weather.icon} ` : ""}
            {venueLine}
            {weather?.tempF != null ? ` · ${weather.tempF}°F` : ""}
          </span>
        ) : null}
      </div>
      {showIntel ? (
        <WcMatchReadCard
          compact
          match={match}
          teams={teams}
          mispriceContext={mispriceContext}
          onGoDeeper={onAskUrTake}
          showGoDeeper={Boolean(onAskUrTake)}
        />
      ) : null}
      {showIntel && !live && !finished ? (
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
    </div>
  );
}
