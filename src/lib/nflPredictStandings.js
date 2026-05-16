import { getTeamRecord } from "./nflPredictDerived.js";
import { compareTeamsForDivisionTable } from "./nflPredictPlayoffs.js";

export function getAllDivisions() {
  return Object.freeze([
    "AFC East",
    "AFC North",
    "AFC South",
    "AFC West",
    "NFC East",
    "NFC North",
    "NFC South",
    "NFC West",
  ]);
}

/**
 * @param {string} division
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function getDivisionStandings(division, picks, schedule, teams) {
  const inDiv = teams.filter((t) => t.division === division);
  const rows = inDiv.map((team) => {
    const r = getTeamRecord(team.abbr, picks, schedule);
    const d = r.wins + r.losses;
    const pct = d === 0 ? 0 : r.wins / d;
    return { team, wins: r.wins, losses: r.losses, remaining: r.remaining, pct };
  });
  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return compareTeamsForDivisionTable(a.team.abbr, b.team.abbr, picks, schedule, teams, division);
  });
  return rows;
}
