/** @typedef {{ id: string, week: number, date: string, timeEt: string, homeTeam: string, awayTeam: string, network: string }} NflGame */

/**
 * @param {string} abbr
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
function winTotalFor(abbr, teams) {
  return teams.find((t) => t.abbr === abbr)?.winTotal ?? 8.5;
}

/** @param {number} n */
function roundProjected(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Projected season record: user picks are exact; unpicked games use win-total priors.
 * @param {string} abbr
 * @param {Record<string, { winner?: string, confidence?: number }>} picks
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function getProjectedRecord(abbr, picks, schedule, teams) {
  let wins = 0;
  let losses = 0;
  let remaining = 0;
  let fracWins = 0;
  let fracLosses = 0;

  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;

    const pk = picks[g.id];
    if (pk?.winner) {
      if (pk.winner === abbr) wins += 1;
      else losses += 1;
      continue;
    }

    remaining += 1;
    const homeWT = winTotalFor(g.homeTeam, teams);
    const awayWT = winTotalFor(g.awayTeam, teams);
    const sum = homeWT + awayWT;
    const homeProb = sum > 0 ? homeWT / sum : 0.5;
    const awayProb = sum > 0 ? awayWT / sum : 0.5;

    if (g.homeTeam === abbr) {
      fracWins += homeProb;
      fracLosses += 1 - homeProb;
    } else {
      fracWins += awayProb;
      fracLosses += 1 - awayProb;
    }
  }

  const seasonWinTotal = winTotalFor(abbr, teams);
  if (remaining > 0 && fracWins > 0) {
    const unpickedTargetWins = Math.max(0, seasonWinTotal - wins);
    const scale = unpickedTargetWins / fracWins;
    fracWins *= scale;
    fracLosses = remaining - fracWins;
  }

  return {
    wins,
    losses,
    remaining,
    projectedWins: roundProjected(wins + fracWins),
    projectedLosses: roundProjected(losses + fracLosses),
  };
}

/**
 * @param {string} abbr
 * @param {Record<string, { winner?: string, confidence?: number }>} picks
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} [teams]
 */
export function getTeamRecord(abbr, picks, schedule, teams) {
  if (teams) {
    return getProjectedRecord(abbr, picks, schedule, teams);
  }
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
  return {
    wins,
    losses,
    remaining,
    projectedWins: wins,
    projectedLosses: losses,
  };
}

/** Display-friendly rounded projected W-L (e.g. 11-6). */
export function formatProjectedRecordLine(proj) {
  const w = Math.round(proj.projectedWins);
  const l = Math.round(proj.projectedLosses);
  return `${w}-${l}`;
}

/** Decimal display (e.g. 11.2-5.8). */
export function formatProjectedRecordDecimal(proj) {
  return `${proj.projectedWins}-${proj.projectedLosses}`;
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
