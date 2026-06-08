/**
 * Static group standings shell — pre-tournament zeros (shared API + client).
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

export function buildStaticGroupsFallback() {
  /** @type {Record<string, Array<Record<string, unknown>>>} */
  const groups = {};
  for (const letter of GROUP_LETTERS) {
    const teams = WC_2026_TEAMS.filter((t) => t.group === letter);
    if (!teams.length) continue;
    groups[letter] = teams.map((t) => ({
      team: t.abbreviation,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    }));
  }
  return groups;
}
