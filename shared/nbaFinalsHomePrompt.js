/**
 * NBA Finals home START HERE — dynamic game number from playoffSeries.
 */

/**
 * @param {{ awayTeam?: { abbr?: string }, homeTeam?: { abbr?: string } } | null | undefined} game
 * @param {Array<{ away?: string, home?: string, awayWins?: number, homeWins?: number }> | null | undefined} playoffSeries
 * @returns {number}
 */
export function getNbaSeriesGameNumberForGame(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !Array.isArray(playoffSeries)) return 0;
  const row = playoffSeries.find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played =
    (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played > 0 ? played + 1 : 0;
}

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
