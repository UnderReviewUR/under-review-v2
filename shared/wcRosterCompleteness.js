/**
 * World Cup 2026 — full-squad completeness checks (48 nations × 26 players).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

export const WC_SQUAD_SIZE = 26;
export const WC_TEAM_COUNT = 48;

/**
 * @param {Record<string, unknown>} registry
 */
export function countRegistryTeams(registry) {
  const teams = registry?.teams;
  if (!teams || typeof teams !== "object") return 0;
  return Object.keys(teams).length;
}

/**
 * @param {Record<string, unknown>} registry
 */
export function wcRosterCompleteness(registry) {
  const teams = registry?.teams && typeof registry.teams === "object" ? registry.teams : {};
  const expectedAbbrs = WC_2026_TEAMS.map((t) => String(t.abbreviation || "").trim().toUpperCase()).filter(Boolean);
  const gotAbbrs = Object.keys(teams);
  const missingTeams = expectedAbbrs.filter((a) => !gotAbbrs.includes(a));
  const extraTeams = gotAbbrs.filter((a) => !expectedAbbrs.includes(a));
  const wrongSquadSize = [];

  for (const abbr of gotAbbrs) {
    const n = Array.isArray(teams[abbr]?.players) ? teams[abbr].players.length : 0;
    if (n !== WC_SQUAD_SIZE) wrongSquadSize.push({ abbr, count: n });
  }

  let playerCount = 0;
  for (const t of Object.values(teams)) {
    playerCount += Array.isArray(t?.players) ? t.players.length : 0;
  }

  const rosterComplete =
    missingTeams.length === 0 &&
    extraTeams.length === 0 &&
    wrongSquadSize.length === 0 &&
    gotAbbrs.length === WC_TEAM_COUNT &&
    playerCount === WC_TEAM_COUNT * WC_SQUAD_SIZE;

  return {
    playerCount,
    teamCount: gotAbbrs.length,
    missingTeams,
    extraTeams,
    wrongSquadSize,
    rosterComplete,
  };
}

/**
 * @param {Record<string, unknown>} registry
 */
export function isWcRosterComplete(registry) {
  return wcRosterCompleteness(registry).rosterComplete;
}
