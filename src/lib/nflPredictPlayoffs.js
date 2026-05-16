import { getTeamRecord } from "./nflPredictDerived.js";

/** @param {string} abbr @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams */
function confOf(abbr, teams) {
  return teams.find((t) => t.abbr === abbr)?.conference ?? null;
}

/** @param {string} abbr @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams */
function divOf(abbr, teams) {
  return teams.find((t) => t.abbr === abbr)?.division ?? null;
}

/**
 * @param {string} abbr
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function getConferenceRecord(abbr, picks, schedule, teams) {
  const c0 = confOf(abbr, teams);
  let w = 0;
  let l = 0;
  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;
    const opp = g.homeTeam === abbr ? g.awayTeam : g.homeTeam;
    if (confOf(opp, teams) !== c0) continue;
    const pk = picks[g.id];
    if (!pk?.winner) continue;
    if (pk.winner === abbr) w += 1;
    else l += 1;
  }
  return { wins: w, losses: l };
}

/**
 * @param {string} abbr
 * @param {string} division
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function getDivisionRecord(abbr, division, picks, schedule, teams) {
  let w = 0;
  let l = 0;
  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;
    const opp = g.homeTeam === abbr ? g.awayTeam : g.homeTeam;
    if (divOf(opp, teams) !== division) continue;
    const pk = picks[g.id];
    if (!pk?.winner) continue;
    if (pk.winner === abbr) w += 1;
    else l += 1;
  }
  return { wins: w, losses: l };
}

/**
 * @param {string} abbrA
 * @param {string} abbrB
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 */
export function getHeadToHead(abbrA, abbrB, picks, schedule) {
  let winsA = 0;
  let winsB = 0;
  for (const g of schedule) {
    const set = new Set([g.homeTeam, g.awayTeam]);
    if (!set.has(abbrA) || !set.has(abbrB)) continue;
    const pk = picks[g.id];
    if (!pk?.winner) continue;
    if (pk.winner === abbrA) winsA += 1;
    else if (pk.winner === abbrB) winsB += 1;
  }
  return { winsA, winsB };
}

/** @param {string} a @param {string} b */
function coinFlipOrder(a, b) {
  const s = [a, b].sort().join("|");
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h % 2 === 0 ? [a, b] : [b, a];
}

/**
 * Opponents faced (once per game).
 * @param {string} abbr
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 */
function opponentsList(abbr, schedule) {
  const out = [];
  for (const g of schedule) {
    if (g.homeTeam === abbr) out.push(g.awayTeam);
    else if (g.awayTeam === abbr) out.push(g.homeTeam);
  }
  return out;
}

/**
 * Win pct from picks for team `abbr` (decided games only).
 * @param {string} abbr
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 */
function pickWinPct(abbr, picks, schedule) {
  const r = getTeamRecord(abbr, picks, schedule);
  const d = r.wins + r.losses;
  return d === 0 ? 0 : r.wins / d;
}

/**
 * SOV: combined win% of opponents beaten (from picks).
 * @param {string} abbr
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 */
function strengthOfVictory(abbr, picks, schedule) {
  let acc = 0;
  let n = 0;
  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;
    const opp = g.homeTeam === abbr ? g.awayTeam : g.homeTeam;
    const pk = picks[g.id];
    if (!pk?.winner) continue;
    if (pk.winner !== abbr) continue;
    acc += pickWinPct(opp, picks, schedule);
    n += 1;
  }
  return n === 0 ? 0 : acc / n;
}

/**
 * SOS: combined win% of all opponents on schedule (from picks).
 * @param {string} abbr
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 */
function strengthOfSchedule(abbr, picks, schedule) {
  const opps = opponentsList(abbr, schedule);
  if (opps.length === 0) return 0;
  let s = 0;
  for (const o of opps) s += pickWinPct(o, picks, schedule);
  return s / opps.length;
}

/**
 * Common opponents for A and B (same season).
 * @param {string} a
 * @param {string} b
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 */
function commonOpponents(a, b, schedule) {
  const oa = new Set(opponentsList(a, schedule));
  const ob = new Set(opponentsList(b, schedule));
  const out = [];
  for (const x of oa) if (ob.has(x)) out.push(x);
  return out;
}

/**
 * W-L vs listed opponents from picks.
 * @param {string} abbr
 * @param {string[]} opps
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 */
function recordVsOpponents(abbr, opps, picks, schedule) {
  const want = new Set(opps);
  let w = 0;
  let l = 0;
  for (const g of schedule) {
    if (g.homeTeam !== abbr && g.awayTeam !== abbr) continue;
    const opp = g.homeTeam === abbr ? g.awayTeam : g.homeTeam;
    if (!want.has(opp)) continue;
    const pk = picks[g.id];
    if (!pk?.winner) continue;
    if (pk.winner === abbr) w += 1;
    else l += 1;
  }
  return { wins: w, losses: l };
}

/**
 * @param {string} abbr
 * @param {string} division
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
function netPointsDivision(abbr, division, picks, schedule, teams) {
  void picks;
  void schedule;
  void teams;
  void abbr;
  void division;
  return 0;
}

function netPointsAll(abbr, picks, schedule) {
  void picks;
  void schedule;
  void abbr;
  return 0;
}

function netPointsConference(abbr, picks, schedule, teams) {
  void picks;
  void schedule;
  void teams;
  void abbr;
  return 0;
}

/**
 * Two-team, same division (NFL order per spec).
 * @returns {number} negative if `a` ranks above `b`
 */
export function compareSameDivision(a, b, picks, schedule, teams, division) {
  const h2h = getHeadToHead(a, b, picks, schedule);
  const hcmp = h2h.winsB - h2h.winsA;
  if (hcmp !== 0) return hcmp;

  const da = getDivisionRecord(a, division, picks, schedule, teams);
  const db = getDivisionRecord(b, division, picks, schedule, teams);
  const dcmp = db.wins - da.wins || da.losses - db.losses;
  if (dcmp !== 0) return dcmp;

  const commons = commonOpponents(a, b, schedule);
  const ca = recordVsOpponents(a, commons, picks, schedule);
  const cb = recordVsOpponents(b, commons, picks, schedule);
  const ccmp = cb.wins - ca.wins || ca.losses - cb.losses;
  if (ccmp !== 0) return ccmp;

  const caConf = getConferenceRecord(a, picks, schedule, teams);
  const cbConf = getConferenceRecord(b, picks, schedule, teams);
  const confCmp = cbConf.wins - caConf.wins || caConf.losses - cbConf.losses;
  if (confCmp !== 0) return confCmp;

  const sovA = strengthOfVictory(a, picks, schedule);
  const sovB = strengthOfVictory(b, picks, schedule);
  if (sovA !== sovB) return sovB - sovA;

  const sosA = strengthOfSchedule(a, picks, schedule);
  const sosB = strengthOfSchedule(b, picks, schedule);
  if (sosA !== sosB) return sosB - sosA;

  const netDiv =
    netPointsDivision(b, division, picks, schedule, teams) -
    netPointsDivision(a, division, picks, schedule, teams);
  if (netDiv !== 0) return netDiv;

  const netAll = netPointsAll(b, picks, schedule) - netPointsAll(a, picks, schedule);
  if (netAll !== 0) return netAll;

  const [first] = coinFlipOrder(a, b);
  return first === a ? -1 : 1;
}

/**
 * Two-team, different divisions, same conference.
 * @returns {number} negative if `a` ranks above `b`
 */
export function compareDifferentDivisionSameConference(a, b, picks, schedule, teams) {
  const ra = getTeamRecord(a, picks, schedule);
  const rb = getTeamRecord(b, picks, schedule);
  const cmpWL = rb.wins - ra.wins || ra.losses - rb.losses;
  if (cmpWL !== 0) return cmpWL;

  const h2h = getHeadToHead(a, b, picks, schedule);
  if (h2h.winsA + h2h.winsB > 0) {
    const hcmp = h2h.winsB - h2h.winsA;
    if (hcmp !== 0) return hcmp;
  }

  const caConf = getConferenceRecord(a, picks, schedule, teams);
  const cbConf = getConferenceRecord(b, picks, schedule, teams);
  const confCmp = cbConf.wins - caConf.wins || caConf.losses - cbConf.losses;
  if (confCmp !== 0) return confCmp;

  const commons = commonOpponents(a, b, schedule);
  if (commons.length >= 4) {
    const ca = recordVsOpponents(a, commons, picks, schedule);
    const cb = recordVsOpponents(b, commons, picks, schedule);
    const ccmp = cb.wins - ca.wins || ca.losses - cb.losses;
    if (ccmp !== 0) return ccmp;
  }

  const sovA = strengthOfVictory(a, picks, schedule);
  const sovB = strengthOfVictory(b, picks, schedule);
  if (sovA !== sovB) return sovB - sovA;

  const sosA = strengthOfSchedule(a, picks, schedule);
  const sosB = strengthOfSchedule(b, picks, schedule);
  if (sosA !== sosB) return sosB - sosA;

  const netC =
    netPointsConference(b, picks, schedule, teams) - netPointsConference(a, picks, schedule, teams);
  if (netC !== 0) return netC;

  const netAll = netPointsAll(b, picks, schedule) - netPointsAll(a, picks, schedule);
  if (netAll !== 0) return netAll;

  return a.localeCompare(b);
}

/**
 * Among division winners (different divisions), same conference.
 * @returns {number} negative if `a` ranks above `b`
 */
function compareDivisionWinnersSameConference(a, b, picks, schedule, teams) {
  return compareDifferentDivisionSameConference(a, b, picks, schedule, teams);
}

/**
 * Wild card / general conference ordering when teams not in same division.
 * @returns {number} negative if `a` ranks above `b`
 */
export function compareConferenceTeams(a, b, picks, schedule, teams) {
  const da = divOf(a, teams);
  const db = divOf(b, teams);
  if (da && db && da === db) return compareSameDivision(a, b, picks, schedule, teams, da);
  return compareDifferentDivisionSameConference(a, b, picks, schedule, teams);
}

/**
 * @param {string} division
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function compareTeamsForDivisionTable(a, b, picks, schedule, teams, division) {
  return compareSameDivision(a, b, picks, schedule, teams, division);
}

/**
 * @param {Record<string, { winner?: string }>} picks
 * @param {readonly import("./nflPredictDerived.js").NflGame[]} schedule
 * @param {readonly import("../data/nfl2026Teams.js").Nfl2026Team[]} teams
 */
export function getPlayoffPicture(picks, schedule, teams) {
  const DIV_ORDER = [
    "AFC East",
    "AFC North",
    "AFC South",
    "AFC West",
    "NFC East",
    "NFC North",
    "NFC South",
    "NFC West",
  ];

  function buildConference(conf) {
    const divTeams = {};
    for (const d of DIV_ORDER) {
      if (!d.startsWith(conf)) continue;
      const inDiv = teams.filter((t) => t.division === d).map((t) => t.abbr);
      const sorted = inDiv.slice().sort((a, b) => compareSameDivision(a, b, picks, schedule, teams, d));
      divTeams[d] = sorted[0];
    }

    const divisionWinners = Object.entries(divTeams).map(([div, abbr]) => ({
      div,
      abbr,
      record: getTeamRecord(abbr, picks, schedule),
      team: teams.find((t) => t.abbr === abbr),
    }));

    const dwSet = new Set(divisionWinners.map((x) => x.abbr));

    const dwSorted = divisionWinners
      .slice()
      .sort((x, y) => compareDivisionWinnersSameConference(x.abbr, y.abbr, picks, schedule, teams));

    const seedsDw = dwSorted.map((x, i) => ({
      seed: i + 1,
      team: x.team,
      record: x.record,
    }));

    const pool = teams.filter((t) => t.conference === conf && !dwSet.has(t.abbr)).map((t) => t.abbr);
    const wcSorted = pool.slice().sort((a, b) => compareConferenceTeams(a, b, picks, schedule, teams));
    const wcTopRaw = wcSorted.slice(0, 3);
    const wcTop = wcTopRaw.slice().sort((a, b) => compareConferenceTeams(a, b, picks, schedule, teams));

    const seedsWc = wcTop.map((abbr, i) => ({
      seed: i + 5,
      team: teams.find((t) => t.abbr === abbr),
      record: getTeamRecord(abbr, picks, schedule),
    }));

    const seeds = [...seedsDw, ...seedsWc];

    const playoffSet = new Set([...dwSet, ...wcTop]);
    const lastWc = wcTop[wcTop.length - 1];
    const lastRec = lastWc ? getTeamRecord(lastWc, picks, schedule) : { wins: 0, losses: 0, remaining: 17 };

    const bubblePool = teams
      .filter((t) => t.conference === conf && !playoffSet.has(t.abbr))
      .map((t) => t.abbr)
      .sort((a, b) => compareConferenceTeams(a, b, picks, schedule, teams));

    const bubble = bubblePool.slice(0, 4).map((abbr) => {
      const r = getTeamRecord(abbr, picks, schedule);
      const gb = ((lastRec.wins - r.wins) + (r.losses - lastRec.losses)) / 2;
      return {
        team: teams.find((t) => t.abbr === abbr),
        record: r,
        gamesBack: Math.max(0, gb),
      };
    });

    return { seeds, bubble, divisionWinners: dwSorted, dwSet, playoffSet };
  }

  return {
    afc: buildConference("AFC"),
    nfc: buildConference("NFC"),
  };
}
