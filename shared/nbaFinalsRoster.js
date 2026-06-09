/**
 * 2026 NBA Finals — players not on the active Finals roster (season stats may still list them).
 */

import { NBA_2026_FINALS_TEAMS } from "./nbaFinalsUtils.js";

/**
 * @param {string} name
 */
export function normalizeFinalsPlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @param {string} playerKeyOrName
 */
export function isNbaFinalsExcludedPlayer(playerKeyOrName) {
  const k = normalizeFinalsPlayerKey(playerKeyOrName);
  return k === "de'aaron fox" || k === "de aaron fox" || k === "fox";
}

/**
 * @param {object | null | undefined} rosterGrounding
 */
export function stripFinalsExcludedFromRosterGrounding(rosterGrounding) {
  if (!rosterGrounding?.playersByTeamAbbrev) return rosterGrounding;
  const playersByTeamAbbrev = { ...rosterGrounding.playersByTeamAbbrev };
  for (const [team, players] of Object.entries(playersByTeamAbbrev)) {
    if (!NBA_2026_FINALS_TEAMS.has(String(team).toUpperCase())) continue;
    playersByTeamAbbrev[team] = (Array.isArray(players) ? players : []).filter(
      (n) => !isNbaFinalsExcludedPlayer(n),
    );
  }
  return { ...rosterGrounding, playersByTeamAbbrev };
}

/**
 * @param {object | null | undefined} nbaContext
 */
export function applyFinalsRosterFiltersToNbaContext(nbaContext) {
  if (!nbaContext || typeof nbaContext !== "object") return nbaContext;
  const rg = stripFinalsExcludedFromRosterGrounding(nbaContext.rosterGrounding);
  const playerStats = Array.isArray(nbaContext.playerStats)
    ? nbaContext.playerStats.filter((row) => !isNbaFinalsExcludedPlayer(row?.name))
    : nbaContext.playerStats;
  return { ...nbaContext, rosterGrounding: rg, playerStats };
}

/**
 * Strip De'Aaron Fox references from Finals copy (model may echo season voice examples).
 * @param {string} text
 */
export function scrubFinalsExcludedPlayerMentions(text) {
  let t = String(text || "");
  if (!t) return t;
  if (!/\bfox\b/i.test(t) && !/de'?aaron/i.test(t)) return t;

  if (
    /\b(isn't|is not|not)\s+on\b[^.!?]{0,100}\b(fox|de'?aaron\s+fox)\b/i.test(t) ||
    /\b(fox|de'?aaron\s+fox)\b[^.!?]{0,100}\b(isn't|is not|not)\s+on\b/i.test(t)
  ) {
    return t;
  }

  t = t.replace(
    /\bwhen\s+fox\s+struggles\b[^.!?]*[.!?]?/gi,
    "with Castle running more creation",
  );
  t = t.replace(/\bfox\s+is\s+out\b[^.!?]*[.!?]?/gi, "");
  t = t.replace(
    /\bde'?aaron\s+fox\b[^.!?]*[.!?]?/gi,
    "the Spurs' backcourt",
  );
  t = t.replace(
    /\bfox\s+struggles\b[^.!?]*[.!?]?/gi,
    "Castle's playmaking load expands",
  );
  t = t.replace(/\bfox\b/gi, "Castle");
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.;])/g, "$1").trim();
  return t;
}
