/**
 * NBA Finals home START HERE — dynamic game number from playoffSeries.
 */

import { getNbaSeriesGameNumberForGame } from "./nbaFinalsUtils.js";

export { getNbaSeriesGameNumberForGame };

/**
 * June ET + playoff tone ≈ NBA Finals window.
 * @param {Date} etNow
 * @param {boolean} nbaPlayoffTone
 */
export function isNbaFinalsWindowEt(etNow, nbaPlayoffTone) {
  return Boolean(nbaPlayoffTone && etNow.getMonth() === 5);
}

/**
 * @param {Array<Record<string, unknown>> | null | undefined} nbaGames
 * @param {Array<Record<string, unknown>> | null | undefined} playoffSeries
 * @returns {{ text: string, prompt: string } | null}
 */
export function buildNbaFinalsHomePrompt(nbaGames, playoffSeries) {
  const rows = Array.isArray(nbaGames) ? nbaGames : [];
  const game =
    rows.find((g) => g?.state === "in") ||
    rows.find((g) => g?.state === "pre") ||
    null;
  if (!game) return null;

  const away = String(game.awayTeam?.abbr || game.awayTeam?.name || "Away").trim();
  const home = String(game.homeTeam?.abbr || game.homeTeam?.name || "Home").trim();
  const num = getNbaSeriesGameNumberForGame(game, playoffSeries);
  const gameLabel = num > 0 ? `Game ${num}` : "tonight's game";

  return {
    text: `Best angle for NBA Finals ${gameLabel} tonight?`,
    prompt: `NBA Finals ${gameLabel} tonight (${away} @ ${home}): what is the sharpest angle — spread, total, or key prop — and what one thing flips the read?`,
  };
}
