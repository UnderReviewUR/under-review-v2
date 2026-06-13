/**
 * FIFA WC 2026 knockout bracket — openfootball/worldcup.json template (matches 73–104).
 * @see https://github.com/openfootball/worldcup.json
 */

import { wcRoundKey } from "./wcPhaseUtils.js";

/** @typedef {{ num: number, team1: string, team2: string }} WcKnockoutTemplateMatch */
/** @typedef {{ round: "r32"|"r16"|"qf"|"sf"|"third"|"final", matches: WcKnockoutTemplateMatch[] }} WcKnockoutTemplateRound */

/** Full knockout tree from openfootball 2026/worldcup.json. */
export const WC2026_KNOCKOUT_BRACKET = /** @type {WcKnockoutTemplateRound[]} */ ([
  {
    round: "r32",
    matches: [
      { num: 73, team1: "2A", team2: "2B" },
      { num: 74, team1: "1E", team2: "3A/B/C/D/F" },
      { num: 75, team1: "1F", team2: "2C" },
      { num: 76, team1: "1C", team2: "2F" },
      { num: 77, team1: "1I", team2: "3C/D/F/G/H" },
      { num: 78, team1: "2E", team2: "2I" },
      { num: 79, team1: "1A", team2: "3C/E/F/H/I" },
      { num: 80, team1: "1L", team2: "3E/H/I/J/K" },
      { num: 81, team1: "1D", team2: "3B/E/F/I/J" },
      { num: 82, team1: "1G", team2: "3A/E/H/I/J" },
      { num: 83, team1: "2K", team2: "2L" },
      { num: 84, team1: "1H", team2: "2J" },
      { num: 85, team1: "1B", team2: "3E/F/G/I/J" },
      { num: 86, team1: "1J", team2: "2H" },
      { num: 87, team1: "1K", team2: "3D/E/I/J/L" },
      { num: 88, team1: "2D", team2: "2G" },
    ],
  },
  {
    round: "r16",
    matches: [
      { num: 89, team1: "W74", team2: "W77" },
      { num: 90, team1: "W73", team2: "W75" },
      { num: 91, team1: "W76", team2: "W78" },
      { num: 92, team1: "W79", team2: "W80" },
      { num: 93, team1: "W83", team2: "W84" },
      { num: 94, team1: "W81", team2: "W82" },
      { num: 95, team1: "W86", team2: "W88" },
      { num: 96, team1: "W85", team2: "W87" },
    ],
  },
  {
    round: "qf",
    matches: [
      { num: 97, team1: "W89", team2: "W90" },
      { num: 98, team1: "W93", team2: "W94" },
      { num: 99, team1: "W91", team2: "W92" },
      { num: 100, team1: "W95", team2: "W96" },
    ],
  },
  {
    round: "sf",
    matches: [
      { num: 101, team1: "W97", team2: "W98" },
      { num: 102, team1: "W99", team2: "W100" },
    ],
  },
  {
    round: "third",
    matches: [{ num: 103, team1: "L101", team2: "L102" }],
  },
  {
    round: "final",
    matches: [{ num: 104, team1: "W101", team2: "W102" }],
  },
]);

/**
 * @param {string} slot
 */
export function parseBracketSlot(slot) {
  const s = String(slot || "").trim();
  if (/^W(\d+)$/.test(s)) return { kind: "winner", matchNum: Number(s.slice(1)) };
  if (/^L(\d+)$/.test(s)) return { kind: "loser", matchNum: Number(s.slice(1)) };
  if (/^1([A-L])$/.test(s)) return { kind: "first", group: s[1] };
  if (/^2([A-L])$/.test(s)) return { kind: "second", group: s[1] };
  if (/^3/.test(s)) {
    const groups = s
      .slice(1)
      .split("/")
      .map((g) => g.trim().toUpperCase())
      .filter(Boolean);
    return { kind: "third", eligibleGroups: groups };
  }
  return { kind: "unknown", raw: s };
}

/**
 * Assign each R32 third-place slot to a concrete team from the 8 best thirds.
 * Greedy: walk R32 matches in num order; pick highest-ranked eligible third not yet used.
 * @param {WcKnockoutTemplateMatch[]} r32Matches
 * @param {Array<{ team: object, group: string }>} bestThirdRanked
 */
export function assignThirdPlaceToR32Slots(r32Matches, bestThirdRanked) {
  /** @type {Map<number, object>} */
  const byMatchNum = new Map();
  const used = new Set();

  for (const m of r32Matches) {
    const thirdSlot = [m.team1, m.team2].find((slot) => String(slot).startsWith("3"));
    if (!thirdSlot) continue;
    const parsed = parseBracketSlot(thirdSlot);
    if (parsed.kind !== "third") continue;

    const pick =
      bestThirdRanked.find(
        (row) =>
          parsed.eligibleGroups.includes(String(row.group || "").toUpperCase()) &&
          !used.has(row.team.abbreviation),
      ) ||
      bestThirdRanked.find((row) => !used.has(row.team.abbreviation));
    if (pick) {
      used.add(pick.team.abbreviation);
      byMatchNum.set(m.num, pick.team);
    }
  }

  return byMatchNum;
}

/**
 * @param {Record<string, unknown>} match
 */
export function isKnockoutCompletedMatch(match) {
  const key = wcRoundKey(match?.round);
  return key !== "group" && key !== "unknown";
}

/**
 * @param {Array<Record<string, unknown>>} completedMatches
 */
export function knockoutCompletedMatches(completedMatches) {
  return (completedMatches || []).filter(isKnockoutCompletedMatch);
}

/**
 * @param {Array<Record<string, unknown>>} completedMatches
 * @param {object | null} teamA
 * @param {object | null} teamB
 * @param {number | null} [matchNum]
 */
export function findCompletedKnockoutMatch(completedMatches, teamA, teamB, matchNum = null) {
  if (!teamA || !teamB) return null;
  const a = String(teamA.abbreviation || "").toUpperCase();
  const b = String(teamB.abbreviation || "").toUpperCase();
  const num = Number(matchNum);

  for (const m of knockoutCompletedMatches(completedMatches)) {
    if (Number.isFinite(num) && num > 0 && Number(m.openFootballNum) === num) return m;
    const h = String(m.homeTeam || "").toUpperCase();
    const away = String(m.awayTeam || "").toUpperCase();
    if ((h === a && away === b) || (h === b && away === a)) return m;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} played
 * @param {object} teamA
 * @param {object} teamB
 */
export function winnerFromCompletedMatch(played, teamA, teamB) {
  const homeIsA =
    String(played.homeTeam || "").toUpperCase() === String(teamA.abbreviation || "").toUpperCase();
  const goalsA = homeIsA ? Number(played.homeScore) : Number(played.awayScore);
  const goalsB = homeIsA ? Number(played.awayScore) : Number(played.homeScore);
  if (!Number.isFinite(goalsA) || !Number.isFinite(goalsB)) return null;
  if (goalsA > goalsB) return teamA;
  if (goalsB > goalsA) return teamB;
  return null;
}

/**
 * @param {{
 *   groupResults: Map<string, Array<{ team: object }>>,
 *   thirdByMatchNum: Map<number, object>,
 *   winners: Map<number, object>,
 *   losers: Map<number, object>,
 *   currentMatchNum?: number | null,
 * }} ctx
 * @param {string} slot
 */
export function resolveBracketSlot(slot, ctx) {
  const parsed = parseBracketSlot(slot);
  if (parsed.kind === "first") {
    return ctx.groupResults.get(parsed.group)?.[0]?.team ?? null;
  }
  if (parsed.kind === "second") {
    return ctx.groupResults.get(parsed.group)?.[1]?.team ?? null;
  }
  if (parsed.kind === "third") {
    const num = ctx.currentMatchNum;
    return num != null ? ctx.thirdByMatchNum.get(num) ?? null : null;
  }
  if (parsed.kind === "winner") {
    return ctx.winners.get(parsed.matchNum) ?? null;
  }
  if (parsed.kind === "loser") {
    return ctx.losers.get(parsed.matchNum) ?? null;
  }
  return null;
}

/**
 * Resolve R32 pairings from group standings + best thirds (openfootball slots).
 * @param {Map<string, Array<{ team: object }>>} groupResults
 * @param {Array<{ team: object, group: string }>} bestThirdRanked
 */
export function buildR32PairingsFromTemplate(groupResults, bestThirdRanked) {
  const r32 = WC2026_KNOCKOUT_BRACKET.find((r) => r.round === "r32")?.matches || [];
  const thirdByMatchNum = assignThirdPlaceToR32Slots(r32, bestThirdRanked);
  /** @type {Array<[object, object, number]>} */
  const pairings = [];

  for (const m of r32) {
    const ctx = {
      groupResults,
      thirdByMatchNum,
      winners: new Map(),
      losers: new Map(),
      currentMatchNum: m.num,
    };
    const teamA = resolveBracketSlot(m.team1, ctx);
    const teamB = resolveBracketSlot(m.team2, ctx);
    if (teamA && teamB) pairings.push([teamA, teamB, m.num]);
  }

  return pairings;
}
