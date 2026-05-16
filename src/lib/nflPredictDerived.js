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

/** SOS offset multiplier — tuned so all 32 teams have unique projectedWins at 0 picks. */
const SOS_OFFSET_MULTIPLIER = 0.12;

/** Rank spread among teams sharing the same O/U (from schedule matchup strength). */
const PEER_SPREAD_STEP = 0.12;

/** @type {WeakMap<object, { leagueAvg: number, byAbbr: Map<string, number>, rawFracByAbbr: Map<string, number> }>} */
const sosCache = new WeakMap();

/**
 * @param {string} abbr
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
function computeRawMatchupFracWins(abbr, schedule, teams) {
  let fracWins = 0;
  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;
    const homeWT = winTotalFor(g.homeTeam, teams);
    const awayWT = winTotalFor(g.awayTeam, teams);
    const sum = homeWT + awayWT;
    const homeProb = sum > 0 ? homeWT / sum : 0.5;
    const awayProb = sum > 0 ? awayWT / sum : 0.5;
    if (g.homeTeam === abbr) fracWins += homeProb;
    else fracWins += awayProb;
  }
  return fracWins;
}

/**
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
function getSosOffsetData(schedule, teams) {
  const key = teams;
  let cached = sosCache.get(key);
  if (!cached) {
    const leagueAvg = teams.reduce((s, t) => s + t.winTotal, 0) / teams.length;
    const byAbbr = new Map();
    const rawFracByAbbr = new Map();
    for (const t of teams) {
      let sum = 0;
      let n = 0;
      for (const g of schedule) {
        if (g.homeTeam !== t.abbr && g.awayTeam !== t.abbr) continue;
        const opp = g.homeTeam === t.abbr ? g.awayTeam : g.homeTeam;
        sum += winTotalFor(opp, teams);
        n += 1;
      }
      byAbbr.set(t.abbr, n > 0 ? sum / n : leagueAvg);
      rawFracByAbbr.set(t.abbr, computeRawMatchupFracWins(t.abbr, schedule, teams));
    }
    cached = { leagueAvg, byAbbr, rawFracByAbbr };
    sosCache.set(key, cached);
  }
  return cached;
}

/**
 * @param {string} abbr
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
/**
 * @param {string} abbr
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
/**
 * Spread projections within the same O/U tier by schedule matchup strength.
 * @param {string} abbr
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 * @param {Map<string, number>} rawFracByAbbr
 */
function peerScheduleSpread(abbr, teams, rawFracByAbbr) {
  const wt = winTotalFor(abbr, teams);
  const peers = teams
    .filter((t) => t.winTotal === wt)
    .map((t) => t.abbr)
    .sort((a, b) => {
      const d = (rawFracByAbbr.get(a) ?? 0) - (rawFracByAbbr.get(b) ?? 0);
      return d !== 0 ? d : a.localeCompare(b);
    });
  const rank = peers.indexOf(abbr);
  const mid = (peers.length - 1) / 2;
  return (rank - mid) * PEER_SPREAD_STEP;
}

/**
 * @param {string} abbr
 * @param {readonly NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
function scheduleStrengthOffset(abbr, schedule, teams) {
  const { leagueAvg, byAbbr, rawFracByAbbr } = getSosOffsetData(schedule, teams);
  const avgOppWT = byAbbr.get(abbr) ?? leagueAvg;
  const sosAvg = (avgOppWT - leagueAvg) * SOS_OFFSET_MULTIPLIER;
  const peer = peerScheduleSpread(abbr, teams, rawFracByAbbr);
  return sosAvg + peer;
}

/** @param {number} n */
function clampProjectedWins(n) {
  return Math.min(16.5, Math.max(0.5, n));
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

    if (g.homeTeam === abbr) fracWins += homeProb;
    else fracWins += awayProb;
  }

  const seasonWinTotal = winTotalFor(abbr, teams);
  const unpickedShare = remaining / 17;
  const sosOffset = scheduleStrengthOffset(abbr, schedule, teams) * unpickedShare;
  if (remaining > 0 && fracWins > 0) {
    const unpickedTargetWins = Math.max(0, seasonWinTotal - wins);
    const scale = unpickedTargetWins / fracWins;
    fracWins *= scale;
  }

  const rawWins = clampProjectedWins(wins + fracWins + sosOffset);
  const rawLosses = 17 - rawWins;

  return {
    wins,
    losses,
    remaining,
    projectedWins: roundProjected(rawWins),
    projectedLosses: roundProjected(rawLosses),
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
