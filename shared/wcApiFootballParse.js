/**
 * Parse API-Football responses → UnderReview WC shapes.
 */

import { normalizeEspnAbbr } from "../api/_wcEspn.js";
import { normalizeWcPlayerName } from "./wcPlayerRegistry.js";
import {
  abbrFromApiFootballTeamName,
  espnEventMapKey,
} from "./wcApiFootballTeamMap.js";

/**
 * @param {unknown} json
 */
export function parseApiFootballFixtures(json) {
  const rows = Array.isArray(json?.response) ? json.response : [];
  /** @type {Record<string, { apiFixtureId: number, homeTeam: string, awayTeam: string, date: string, status: string }>} */
  const byMapKey = {};
  /** @type {Record<string, number>} */
  const byApiFixtureId = {};

  for (const row of rows) {
    const fixtureId = Number(row?.fixture?.id);
    if (!Number.isFinite(fixtureId)) continue;
    const homeName = row?.teams?.home?.name;
    const awayName = row?.teams?.away?.name;
    const homeAbbr = abbrFromApiFootballTeamName(homeName);
    const awayAbbr = abbrFromApiFootballTeamName(awayName);
    if (!homeAbbr || !awayAbbr) continue;

    const date = String(row?.fixture?.date || "").slice(0, 10);
    const status = String(row?.fixture?.status?.short || row?.fixture?.status?.long || "").toUpperCase();
    const mapKey = espnEventMapKey(homeAbbr, awayAbbr, date);

    const entry = {
      apiFixtureId: fixtureId,
      homeTeam: homeAbbr,
      awayTeam: awayAbbr,
      date,
      status,
      homeName: String(homeName || ""),
      awayName: String(awayName || ""),
    };
    byMapKey[mapKey] = entry;
    byApiFixtureId[String(fixtureId)] = entry;
  }

  return { byMapKey, byApiFixtureId, count: Object.keys(byMapKey).length };
}

/**
 * @param {Array<Record<string, unknown>>} espnMatches
 * @param {Record<string, { apiFixtureId: number, homeTeam: string, awayTeam: string, date: string }>} byMapKey
 */
export function linkEspnMatchesToApiFootball(espnMatches, byMapKey) {
  /** @type {Record<string, { apiFixtureId: number, mapKey: string }>} */
  const byEspnEventId = {};

  for (const m of espnMatches || []) {
    const eventId = m?.id != null ? String(m.id) : "";
    if (!eventId || eventId.startsWith("wc-promo-")) continue;
    const home = normalizeEspnAbbr(m.homeTeam);
    const away = normalizeEspnAbbr(m.awayTeam);
    const date = String(m.date || "").slice(0, 10);
    if (!home || !away) continue;

    const direct = byMapKey[espnEventMapKey(home, away, date)];
    if (direct) {
      byEspnEventId[eventId] = { apiFixtureId: direct.apiFixtureId, mapKey: espnEventMapKey(home, away, date) };
      continue;
    }

    // Date drift ±1 day for timezone slippage
    for (const offset of [-1, 1]) {
      const d = new Date(`${date}T12:00:00Z`);
      if (!Number.isFinite(d.getTime())) continue;
      d.setUTCDate(d.getUTCDate() + offset);
      const altDate = d.toISOString().slice(0, 10);
      const hit = byMapKey[espnEventMapKey(home, away, altDate)];
      if (hit) {
        byEspnEventId[eventId] = {
          apiFixtureId: hit.apiFixtureId,
          mapKey: espnEventMapKey(home, away, altDate),
        };
        break;
      }
    }
  }

  return byEspnEventId;
}

/**
 * @param {unknown} json
 * @param {"assists" | "yellow" | "red"} kind
 */
export function parseApiFootballTopPlayers(json, kind) {
  const rows = Array.isArray(json?.response) ? json.response : [];
  /** @type {Array<{ name: string, nationAbbr: string, total: number, appearances: number | null }>} */
  const out = [];

  for (const row of rows) {
    const player = row?.player || {};
    const name = normalizeWcPlayerName(
      player.name || `${player.firstname || ""} ${player.lastname || ""}`.trim(),
    );
    if (!name) continue;

    const stats = Array.isArray(row?.statistics) ? row.statistics[0] : row?.statistics;
    const teamName = stats?.team?.name;
    const nationAbbr = abbrFromApiFootballTeamName(teamName);
    if (!nationAbbr) continue;

    const games = stats?.games || {};
    const cards = stats?.cards || {};
    const goals = stats?.goals || {};
    let total = 0;
    if (kind === "assists") total = Number(goals.assists) || 0;
    if (kind === "yellow") total = Number(cards.yellow) || 0;
    if (kind === "red") total = Number(cards.red) || 0;
    if (total <= 0) continue;

    const appearances = games.appearences != null ? Number(games.appearences) : Number(games.appearances);
    out.push({
      name,
      nationAbbr,
      total,
      appearances: Number.isFinite(appearances) ? appearances : null,
    });
  }

  out.sort((a, b) => b.total - a.total);
  return out.slice(0, 25);
}

/**
 * @param {unknown} json
 */
export function parseApiFootballFixturePlayers(json) {
  const blocks = Array.isArray(json?.response) ? json.response : [];
  /** @type {Array<{ name: string, nationAbbr: string, goals: number, assists: number, shots: number, cardsYellow: number, cardsRed: number, rating: number | null }>} */
  const players = [];

  for (const block of blocks) {
    const teamName = block?.team?.name;
    const nationAbbr = abbrFromApiFootballTeamName(teamName);
    if (!nationAbbr) continue;

    for (const row of block?.players || []) {
      const p = row?.player || {};
      const name = normalizeWcPlayerName(p.name || `${p.firstname || ""} ${p.lastname || ""}`.trim());
      if (!name) continue;
      const stats = Array.isArray(row?.statistics) ? row.statistics[0] : row?.statistics;
      const games = stats?.games || {};
      const goals = stats?.goals || {};
      const shots = stats?.shots || {};
      const cards = stats?.cards || {};

      players.push({
        name,
        nationAbbr,
        goals: Number(goals.total) || 0,
        assists: Number(goals.assists) || 0,
        shots: Number(shots.total) || 0,
        cardsYellow: Number(cards.yellow) || 0,
        cardsRed: Number(cards.red) || 0,
        rating: games.rating != null ? Number(games.rating) : null,
      });
    }
  }

  return players;
}

/**
 * @param {{ assists?: Array<Record<string, unknown>>, yellowCards?: Array<Record<string, unknown>>, redCards?: Array<Record<string, unknown>> }} leaders
 */
export function formatApiFootballLeadersPromptBlock(leaders) {
  if (!leaders) return "";
  const assists = leaders.assists || [];
  const yellow = leaders.yellowCards || [];
  const red = leaders.redCards || [];
  if (!assists.length && !yellow.length && !red.length) return "";

  const lines = [
    "API-FOOTBALL TOURNAMENT LEADERS (supplementary backup — cite only rows below; ESPN registry still primary for live match intel):",
    "  Source: API-Football free tier · delayed vs live ESPN box scores",
  ];

  if (assists.length) {
    lines.push("  TOP ASSISTS (tournament):");
    for (const r of assists.slice(0, 10)) {
      const apps = r.appearances != null ? ` · ${r.appearances} apps` : "";
      lines.push(`    ${r.name} (${r.nationAbbr}) — ${r.total} assist(s)${apps}`);
    }
  }
  if (yellow.length) {
    lines.push("  MOST YELLOW CARDS (tournament):");
    for (const r of yellow.slice(0, 8)) {
      lines.push(`    ${r.name} (${r.nationAbbr}) — ${r.total} yellow`);
    }
  }
  if (red.length) {
    lines.push("  MOST RED CARDS (tournament):");
    for (const r of red.slice(0, 6)) {
      lines.push(`    ${r.name} (${r.nationAbbr}) — ${r.total} red`);
    }
  }

  return lines.join("\n");
}

/**
 * @param {Array<Record<string, unknown>>} players
 * @param {string} [homeTeam]
 * @param {string} [awayTeam]
 */
export function formatApiFootballLivePlayersPromptBlock(players, homeTeam, awayTeam) {
  if (!players?.length) return "";
  const home = normalizeEspnAbbr(homeTeam);
  const away = normalizeEspnAbbr(awayTeam);
  const scoped = players.filter((p) => p.nationAbbr === home || p.nationAbbr === away);
  const rows = (scoped.length ? scoped : players).slice(0, 14);
  if (!rows.length) return "";

  const lines = [
    "API-FOOTBALL LIVE PLAYER STATS (supplementary cross-check — not primary truth layer):",
    "  Prefer ESPN MATCH INTEL for live answers; use this block only when citing API-Football-specific totals.",
  ];
  for (const p of rows) {
    const bits = [];
    if (p.goals) bits.push(`${p.goals}G`);
    if (p.assists) bits.push(`${p.assists}A`);
    if (p.shots) bits.push(`${p.shots} shots`);
    if (p.cardsYellow) bits.push(`${p.cardsYellow} yellow`);
    if (p.cardsRed) bits.push(`${p.cardsRed} red`);
    if (p.rating != null && Number.isFinite(p.rating)) bits.push(`rating ${p.rating}`);
    lines.push(`    ${p.name} (${p.nationAbbr})${bits.length ? `: ${bits.join(", ")}` : ""}`);
  }
  return lines.join("\n");
}
