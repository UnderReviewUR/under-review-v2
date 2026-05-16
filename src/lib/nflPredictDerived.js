/** @typedef {{ id: string, week: number, date: string, timeEt: string, homeTeam: string, awayTeam: string, network: string }} NflGame */

/**
 * @param {string} abbr
 * @param {Record<string, { winner?: string, confidence?: number }>} picks
 * @param {readonly NflGame[]} schedule
 */
export function getTeamRecord(abbr, picks, schedule) {
  let wins = 0;
  let losses = 0;
  let remaining = 0;
  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;
    const pk = picks[g.id];
    if (!pk?.winner) {
      remaining += 1;
      continue;
    }
    if (pk.winner === abbr) wins += 1;
    else losses += 1;
  }
  return { wins, losses, remaining };
}

/**
 * @param {string} abbr
 * @param {readonly NflGame[]} schedule
 */
export function getTeamSchedule(abbr, schedule) {
  return schedule
    .filter((g) => g.homeTeam === abbr || g.awayTeam === abbr)
    .slice()
    .sort((a, b) => a.week - b.week || a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * @param {string} abbr
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function getImpliedWinPct(abbr, teams) {
  const t = teams.find((x) => x.abbr === abbr);
  if (!t) return 0;
  return t.winTotal / 17;
}

/**
 * @param {string} gameId
 * @param {string} winner
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function isBoldPick(gameId, winner, schedule, teams) {
  const g = schedule.find((x) => x.id === gameId);
  if (!g) return false;
  const loser = winner === g.homeTeam ? g.awayTeam : g.homeTeam;
  const wt = (a) => teams.find((t) => t.abbr === a)?.winTotal ?? 0;
  return wt(winner) + 3 <= wt(loser);
}
