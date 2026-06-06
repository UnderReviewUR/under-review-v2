/**
 * NBA Finals home START HERE — dynamic game number from playoffSeries.
 */

import {
  getNbaSeriesGameNumberForGame,
  NBA_2026_FINALS_TEAMS,
  resolveNextNbaFinalsScheduledGame,
} from "./nbaFinalsUtils.js";

export { getNbaSeriesGameNumberForGame };

/**
 * June ET + playoff tone ≈ NBA Finals window.
 * @param {Date} etNow
 * @param {boolean} nbaPlayoffTone
 */
export function isNbaFinalsWindowEt(etNow, nbaPlayoffTone) {
  return Boolean(nbaPlayoffTone && etNow.getMonth() === 5);
}

function finalsSeriesLeadNote(row) {
  if (!row) return "";
  const aw = Number(row.awayWins) || 0;
  const hw = Number(row.homeWins) || 0;
  if (aw === hw) return "";
  const sa = String(row.away || "").toUpperCase();
  const sh = String(row.home || "").toUpperCase();
  const leader = aw > hw ? sa : sh;
  const nick = { NYK: "Knicks", SAS: "Spurs" };
  return ` ${nick[leader] || leader} lead the series ${Math.max(aw, hw)}-${Math.min(aw, hw)}.`;
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} nbaGames
 * @param {Array<Record<string, unknown>> | null | undefined} playoffSeries
 * @returns {{ text: string, prompt: string } | null}
 */
export function buildNbaFinalsHomePrompt(nbaGames, playoffSeries) {
  const rows = Array.isArray(nbaGames) ? nbaGames : [];
  let game =
    rows.find((g) => g?.state === "in") ||
    rows.find((g) => g?.state === "pre") ||
    null;

  const finalsRow = (playoffSeries || []).find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return NBA_2026_FINALS_TEAMS.has(sa) && NBA_2026_FINALS_TEAMS.has(sh);
  });

  if (!game && finalsRow) {
    const next = resolveNextNbaFinalsScheduledGame();
    if (next) {
      game = {
        state: "pre",
        awayTeam: { abbr: next.away },
        homeTeam: { abbr: next.home },
        startTimeUtc: next.tipoffUtc,
      };
    }
  }

  if (!game) return null;

  const away = String(game.awayTeam?.abbr || game.awayTeam?.name || "Away").trim();
  const home = String(game.homeTeam?.abbr || game.homeTeam?.name || "Home").trim();
  const hint = Number(finalsRow?.gameNumberHint);
  const num =
    Number.isFinite(hint) && hint > 0
      ? hint
      : getNbaSeriesGameNumberForGame(game, playoffSeries);
  const gameLabel = num > 0 ? `Game ${num}` : "the next game";
  const dayLabel = String(game.slateDayLabel || "").trim();
  const when =
    game.state === "in"
      ? "live"
      : dayLabel && dayLabel !== "Tonight"
        ? `on ${dayLabel}`
        : "tonight";

  const seriesNote = finalsSeriesLeadNote(finalsRow);

  return {
    text: `Best angle for NBA Finals ${gameLabel}?`,
    prompt: `NBA Finals ${gameLabel} ${when} (${away} @ ${home}):${seriesNote} what is the sharpest angle — spread, total, or key prop — and what one thing flips the read?`,
  };
}
