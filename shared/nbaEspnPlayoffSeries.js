/**
 * Parse NBA playoff series wins from ESPN scoreboard events.
 * Series lives on competitions[0].series (not event.series).
 */

import { canonicalizeTeamAbbr } from "./gameLineSpread.js";

/**
 * @param {string | undefined} record
 */
export function parseSeriesWinsFromEspnRecord(record) {
  const m = String(record || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return 0;
  return parseInt(m[1], 10) || 0;
}

/**
 * @param {Record<string, unknown>} ev
 */
export function parseEspnPlayoffSeriesRowFromEvent(ev) {
  const comp = ev?.competitions?.[0];
  if (!comp) return null;

  const series = comp?.series || ev?.series;
  const competitors = Array.isArray(comp?.competitors) ? comp.competitors : [];
  const home = competitors.find((c) => c?.homeAway === "home");
  const away = competitors.find((c) => c?.homeAway === "away");
  const homeAbbr = canonicalizeTeamAbbr(home?.team?.abbreviation);
  const awayAbbr = canonicalizeTeamAbbr(away?.team?.abbreviation);
  if (!homeAbbr || !awayAbbr) return null;

  let homeWins = 0;
  let awayWins = 0;

  const seriesCompetitors = Array.isArray(series?.competitors) ? series.competitors : [];
  const homeId = String(home?.team?.id || home?.id || "");
  const awayId = String(away?.team?.id || away?.id || "");

  for (const sc of seriesCompetitors) {
    const wins = parseInt(String(sc?.wins ?? 0), 10) || 0;
    const id = String(sc?.id || sc?.team?.id || "");
    if (id && homeId && id === homeId) homeWins = wins;
    if (id && awayId && id === awayId) awayWins = wins;
  }

  if (homeWins === 0 && awayWins === 0) {
    homeWins = parseSeriesWinsFromEspnRecord(home?.record);
    awayWins = parseSeriesWinsFromEspnRecord(away?.record);
  }

  if (homeWins === 0 && awayWins === 0 && ev?.seriesStatus) {
    homeWins = parseInt(String(ev.seriesStatus.homeTeamWins ?? 0), 10) || 0;
    awayWins = parseInt(String(ev.seriesStatus.awayTeamWins ?? 0), 10) || 0;
  }

  const notes = Array.isArray(comp?.notes) ? comp.notes : [];
  const gameNote = notes.find((n) => /game\s+\d+/i.test(String(n?.headline || "")));
  const gameNumberHint = gameNote
    ? parseInt(String(gameNote.headline).match(/game\s+(\d+)/i)?.[1] || "0", 10) || null
    : null;

  const roundLabel =
    String(comp?.type?.abbreviation || "").toUpperCase() === "FINAL"
      ? "NBA Finals"
      : series?.title ||
        series?.type?.text ||
        ev?.seriesStatus?.displayName ||
        "";

  return {
    round: roundLabel,
    home: homeAbbr,
    away: awayAbbr,
    homeWins,
    awayWins,
    status: series?.summary || ev?.seriesStatus?.summary || "",
    gameNumberHint,
    seriesId: String(series?.id || ev?.uid || `${awayAbbr}|${homeAbbr}`),
  };
}

/**
 * @param {Array<Record<string, unknown>>} events
 */
export function playoffSeriesRowsFromEspnScoreboardEvents(events) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();

  for (const ev of events || []) {
    const row = parseEspnPlayoffSeriesRowFromEvent(ev);
    if (!row?.home || !row?.away) continue;
    const key = String(row.seriesId || `${row.away}|${row.home}`);
    if (!byKey.has(key)) {
      byKey.set(key, {
        round: row.round,
        home: row.home,
        away: row.away,
        homeWins: row.homeWins,
        awayWins: row.awayWins,
        status: row.status,
        gameNumberHint: row.gameNumberHint,
      });
    }
  }

  return [...byKey.values()];
}
