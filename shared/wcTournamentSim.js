/**
 * World Cup 2026 Monte Carlo tournament simulation.
 *
 * Poisson goal model + Elo-driven λ → group stage → R32 → R16 → QF → SF → Final.
 * 2026 format: 12 groups × 4 teams. Top 2 per group + 8 best 3rd-place = 32 advance.
 *
 * Usage:
 *   const results = simulateTournament(WC_2026_TEAMS, { simCount: 10000 });
 *   // results.teamStats["FRA"] → { advancePct, winPct, r32Pct, ... }
 */

import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { applyPostMatchEloToTeams } from "./wcEloUpdates.js";
import {
  WC2026_KNOCKOUT_BRACKET,
  assignThirdPlaceToR32Slots,
  findCompletedKnockoutMatch,
  isKnockoutCompletedMatch,
  knockoutCompletedMatches,
  resolveBracketSlot,
  winnerFromCompletedMatch,
} from "./wc2026KnockoutBracket.js";

// ── Poisson helpers ──

/** Poisson PMF: P(X = k) given mean λ */
function poissonPmf(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** Sample from Poisson distribution using inverse CDF. */
function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// ── Elo → expected goals ──

const BASELINE_GOALS = 1.30; // avg goals per team per WC match (historical ~2.6 total)
const HOST_BOOST_ELO = 50;

/** Convert Elo difference to expected goals for teamA. */
function eloToExpectedGoals(eloA, eloB) {
  const diff = eloA - eloB;
  const multiplier = Math.pow(10, diff / 800); // gentler than 400 for goal expectation
  return BASELINE_GOALS * multiplier;
}

/** Get effective Elo (with host boost). */
function effectiveElo(team) {
  return team.isHost ? team.eloRating + HOST_BOOST_ELO : team.eloRating;
}

// ── Match simulation ──

/**
 * Simulate a single match.
 * @param {object} teamA
 * @param {object} teamB
 * @param {boolean} allowDraw
 * @returns {{ goalsA: number, goalsB: number, winner: object, loser: object, draw: boolean, extraTime: boolean, penalties: boolean }}
 */
function simulateMatch(teamA, teamB, allowDraw = true) {
  const eloA = effectiveElo(teamA);
  const eloB = effectiveElo(teamB);

  const lambdaA = eloToExpectedGoals(eloA, eloB);
  const lambdaB = eloToExpectedGoals(eloB, eloA);

  let goalsA = poissonSample(lambdaA);
  let goalsB = poissonSample(lambdaB);

  if (goalsA === goalsB && !allowDraw) {
    // Extra time: ~0.4 goals per team in 30min
    const etA = poissonSample(lambdaA * 0.3);
    const etB = poissonSample(lambdaB * 0.3);
    goalsA += etA;
    goalsB += etB;

    if (goalsA === goalsB) {
      // Penalties: slight favorite to stronger team
      const pA = 0.5 + (eloA - eloB) / 4000; // very slight edge
      if (Math.random() < pA) {
        goalsA++;
      } else {
        goalsB++;
      }
      return {
        goalsA, goalsB,
        winner: goalsA > goalsB ? teamA : teamB,
        loser: goalsA > goalsB ? teamB : teamA,
        draw: false, extraTime: true, penalties: true,
      };
    }

    return {
      goalsA, goalsB,
      winner: goalsA > goalsB ? teamA : teamB,
      loser: goalsA > goalsB ? teamB : teamA,
      draw: false, extraTime: true, penalties: false,
    };
  }

  return {
    goalsA, goalsB,
    winner: goalsA > goalsB ? teamA : (goalsB > goalsA ? teamB : null),
    loser: goalsA > goalsB ? teamB : (goalsB > goalsA ? teamA : null),
    draw: goalsA === goalsB,
    extraTime: false, penalties: false,
  };
}

// ── Group stage ──

/**
 * @param {unknown} status
 */
export function isWcFinishedMatchStatus(status) {
  const s = String(status || "")
    .trim()
    .toUpperCase();
  return s === "FT" || s === "FINISHED" || s === "COMPLETED" || s === "AET" || s === "PEN";
}

/**
 * @param {Array<object>} groupTeams
 */
function allRoundRobinPairs(groupTeams) {
  /** @type {Array<[object, object]>} */
  const pairs = [];
  for (let i = 0; i < groupTeams.length; i++) {
    for (let j = i + 1; j < groupTeams.length; j++) {
      pairs.push([groupTeams[i], groupTeams[j]]);
    }
  }
  return pairs;
}

/**
 * @param {Array<Record<string, unknown>>} completedMatches
 * @param {string} abbrA
 * @param {string} abbrB
 */
function findCompletedGroupMatch(completedMatches, abbrA, abbrB) {
  const a = String(abbrA || "").toUpperCase();
  const b = String(abbrB || "").toUpperCase();
  for (const m of completedMatches || []) {
    if (!isWcFinishedMatchStatus(m?.status)) continue;
    const h = String(m.homeTeam || "").toUpperCase();
    const away = String(m.awayTeam || "").toUpperCase();
    if ((h === a && away === b) || (h === b && away === a)) return m;
  }
  return null;
}

/**
 * @param {Map<string, { team: object, points: number, gd: number, gf: number }>} stats
 * @param {object} teamA
 * @param {object} teamB
 * @param {number} goalsA
 * @param {number} goalsB
 */
function applyGoalsToGroupStats(stats, teamA, teamB, goalsA, goalsB) {
  const sA = stats.get(teamA.abbreviation);
  const sB = stats.get(teamB.abbreviation);
  if (!sA || !sB) return;

  sA.gf += goalsA;
  sA.gd += goalsA - goalsB;
  sB.gf += goalsB;
  sB.gd += goalsB - goalsA;

  if (goalsA === goalsB) {
    sA.points += 1;
    sB.points += 1;
  } else if (goalsA > goalsB) {
    sA.points += 3;
  } else {
    sB.points += 3;
  }
}

/**
 * @param {Map<string, { team: object, points: number, gd: number, gf: number }>} stats
 */
function sortGroupStandings(stats) {
  return [...stats.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return effectiveElo(b.team) - effectiveElo(a.team);
  });
}

/**
 * Round-robin with verified FT scores fixed; remaining fixtures simulated.
 * @param {Array<object>} groupTeams — 4 teams
 * @param {Array<Record<string, unknown>>} [completedMatches]
 * @returns {Array<{ team: object, points: number, gd: number, gf: number }>} sorted standings
 */
function simulateGroupStage(groupTeams, completedMatches = []) {
  const stats = new Map();
  for (const t of groupTeams) {
    stats.set(t.abbreviation, { team: t, points: 0, gd: 0, gf: 0 });
  }

  for (const [teamA, teamB] of allRoundRobinPairs(groupTeams)) {
    const played = findCompletedGroupMatch(completedMatches, teamA.abbreviation, teamB.abbreviation);
    let goalsA;
    let goalsB;

    if (
      played &&
      played.homeScore != null &&
      played.awayScore != null &&
      Number.isFinite(Number(played.homeScore)) &&
      Number.isFinite(Number(played.awayScore))
    ) {
      const homeIsA =
        String(played.homeTeam || "").toUpperCase() === String(teamA.abbreviation).toUpperCase();
      goalsA = homeIsA ? Number(played.homeScore) : Number(played.awayScore);
      goalsB = homeIsA ? Number(played.awayScore) : Number(played.homeScore);
    } else {
      const result = simulateMatch(teamA, teamB, true);
      goalsA = result.goalsA;
      goalsB = result.goalsB;
    }

    applyGoalsToGroupStats(stats, teamA, teamB, goalsA, goalsB);
  }

  return sortGroupStandings(stats);
}

/**
 * @param {Array<Record<string, unknown>>} completedMatches
 */
export function completedWcMatchesFromList(completedMatches) {
  return (completedMatches || []).filter((m) => isWcFinishedMatchStatus(m?.status));
}

/**
 * @param {Array<object>} groupTeams
 * @param {Array<Record<string, unknown>>} completedMatches
 */
export function completedMatchesForGroup(groupTeams, completedMatches) {
  const abbrs = new Set(groupTeams.map((t) => String(t.abbreviation).toUpperCase()));
  return completedWcMatchesFromList(completedMatches).filter((m) => {
    const h = String(m.homeTeam || "").toUpperCase();
    const a = String(m.awayTeam || "").toUpperCase();
    return abbrs.has(h) && abbrs.has(a);
  });
}

// ── Best 3rd-place selection ──

/**
 * 8 best 3rd-place teams advance (out of 12 groups).
 * @param {Array<{ team: object, points: number, gd: number, gf: number, group: string }>} thirdPlaceTeams
 * @returns {Array<object>} 8 teams that advance
 */
function selectBestThirdPlace(thirdPlaceTeams) {
  return thirdPlaceTeams
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return effectiveElo(b.team) - effectiveElo(a.team);
    })
    .slice(0, 8)
    .map((r) => r.team);
}

// ── Knockout bracket (openfootball template) ──

/**
 * Walk full knockout tree; lock verified FT scores when present.
 * @param {Map<string, Array<{team, points, gd, gf}>>} groupResults
 * @param {Array<{ team: object, group: string, points: number, gd: number, gf: number }>} rankedThirdPlace
 * @param {Array<Record<string, unknown>>} completedKnockout
 * @param {Map<string, object>} tracker
 */
function simulateKnockoutFromTemplate(groupResults, rankedThirdPlace, completedKnockout, tracker) {
  const r32Template = WC2026_KNOCKOUT_BRACKET.find((r) => r.round === "r32")?.matches || [];
  const thirdByMatchNum = assignThirdPlaceToR32Slots(r32Template, rankedThirdPlace.slice(0, 8));
  /** @type {Map<number, object>} */
  const winners = new Map();
  /** @type {Map<number, object>} */
  const losers = new Map();

  for (const round of WC2026_KNOCKOUT_BRACKET) {
    if (round.round === "third") continue;

    for (const m of round.matches) {
      const ctx = {
        groupResults,
        thirdByMatchNum,
        winners,
        losers,
        currentMatchNum: m.num,
      };
      const teamA = resolveBracketSlot(m.team1, ctx);
      const teamB = resolveBracketSlot(m.team2, ctx);
      if (!teamA || !teamB) continue;

      const roundKey = round.round === "final" ? "final" : round.round;
      const tA = tracker.get(teamA.abbreviation);
      const tB = tracker.get(teamB.abbreviation);
      if (tA) tA[roundKey] = (tA[roundKey] || 0) + 1;
      if (tB) tB[roundKey] = (tB[roundKey] || 0) + 1;

      const played = findCompletedKnockoutMatch(completedKnockout, teamA, teamB, m.num);
      /** @type {object | null} */
      let winner = null;
      /** @type {object | null} */
      let loser = null;

      if (played) {
        winner = winnerFromCompletedMatch(played, teamA, teamB);
        if (winner) {
          loser = winner.abbreviation === teamA.abbreviation ? teamB : teamA;
        }
      }

      if (!winner) {
        const result = simulateMatch(teamA, teamB, false);
        winner = result.winner;
        loser = result.loser;
      }

      if (winner) winners.set(m.num, winner);
      if (loser) losers.set(m.num, loser);

      if (round.round === "final" && winner) {
        const tc = tracker.get(winner.abbreviation);
        if (tc) tc.champion = (tc.champion || 0) + 1;
      }
    }
  }

  return winners.get(104) ?? null;
}

// ── Main simulation ──

/**
 * @typedef {object} TeamSimStats
 * @property {string} abbreviation
 * @property {string} name
 * @property {number} eloRating
 * @property {number} groupWinPct — % of sims where team finishes 1st in group
 * @property {number} advancePct — % of sims where team advances past group stage
 * @property {number} r32Pct
 * @property {number} r16Pct
 * @property {number} qfPct
 * @property {number} sfPct
 * @property {number} finalPct
 * @property {number} winPct — % of sims where team wins tournament
 */

/**
 * Run full Monte Carlo tournament simulation.
 * @param {Array<object>} [teams] — defaults to WC_2026_TEAMS
 * @param {{ simCount?: number, completedMatches?: Array<Record<string, unknown>>, applyLiveElo?: boolean }} [opts]
 * @returns {{ teamStats: Record<string, TeamSimStats>, simCount: number, topContenders: TeamSimStats[], liveResultsApplied: boolean, completedMatchCount: number, eloMatchesApplied: number, knockoutResultsApplied: number }}
 */
export function simulateTournament(teams = WC_2026_TEAMS, opts = {}) {
  const simCount = opts.simCount || 10000;
  const completedMatches = completedWcMatchesFromList(opts.completedMatches || []);
  const knockoutCompleted = knockoutCompletedMatches(completedMatches);
  const groupCompleted = completedMatches.filter((m) => !isKnockoutCompletedMatch(m));
  const liveResultsApplied = completedMatches.length > 0;
  const applyLiveElo = opts.applyLiveElo !== false;

  let teamList = teams || WC_2026_TEAMS;
  let eloMatchesApplied = 0;
  if (applyLiveElo && completedMatches.length > 0) {
    const eloOut = applyPostMatchEloToTeams(teamList, completedMatches);
    teamList = eloOut.teams;
    eloMatchesApplied = eloOut.matchesApplied;
  }

  // Group teams by group letter
  /** @type {Map<string, Array<object>>} */
  const groupMap = new Map();
  for (const t of teamList) {
    if (!groupMap.has(t.group)) groupMap.set(t.group, []);
    groupMap.get(t.group).push(t);
  }

  // Initialize tracker
  /** @type {Map<string, {groupWin: number, advance: number, r32: number, r16: number, qf: number, sf: number, final: number, champion: number}>} */
  const tracker = new Map();
  for (const t of teamList) {
    tracker.set(t.abbreviation, {
      groupWin: 0, advance: 0, r32: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0,
    });
  }

  for (let sim = 0; sim < simCount; sim++) {
    // 1. Simulate all group stages
    /** @type {Map<string, Array<{team, points, gd, gf}>>} */
    const groupResults = new Map();
    const allThirdPlace = [];

    for (const [letter, groupTeams] of groupMap) {
      const groupCompletedForGroup = completedMatchesForGroup(groupTeams, groupCompleted);
      const standings = simulateGroupStage(groupTeams, groupCompletedForGroup);
      groupResults.set(letter, standings);

      if (standings.length > 0) {
        const groupWinner = tracker.get(standings[0].team.abbreviation);
        if (groupWinner) groupWinner.groupWin++;
      }

      // Top 2 advance
      for (let i = 0; i < 2 && i < standings.length; i++) {
        const tc = tracker.get(standings[i].team.abbreviation);
        if (tc) tc.advance++;
      }

      // Collect 3rd place
      if (standings.length >= 3) {
        allThirdPlace.push({ ...standings[2], group: letter });
      }
    }

    // 2. Select 8 best 3rd-place teams (ranked for bracket assignment)
    const rankedThirdPlace = selectBestThirdPlace(allThirdPlace).map((team) => {
      const row = allThirdPlace.find((r) => r.team.abbreviation === team.abbreviation);
      return row || { team, group: "", points: 0, gd: 0, gf: 0 };
    });
    const bestThird = rankedThirdPlace.map((r) => r.team);
    for (const t of bestThird) {
      const tc = tracker.get(t.abbreviation);
      if (tc) tc.advance++;
    }

    // 3. Knockout — openfootball bracket + FT lock
    simulateKnockoutFromTemplate(groupResults, rankedThirdPlace, knockoutCompleted, tracker);
  }

  // Compile results
  /** @type {Record<string, TeamSimStats>} */
  const teamStats = {};
  for (const t of teamList) {
    const s = tracker.get(t.abbreviation);
    teamStats[t.abbreviation] = {
      abbreviation: t.abbreviation,
      name: t.name,
      eloRating: t.eloRating,
      group: t.group,
      groupWinPct: round2((s.groupWin / simCount) * 100),
      advancePct: round2((s.advance / simCount) * 100),
      r32Pct: round2((s.r32 / simCount) * 100),
      r16Pct: round2((s.r16 / simCount) * 100),
      qfPct: round2((s.qf / simCount) * 100),
      sfPct: round2((s.sf / simCount) * 100),
      finalPct: round2((s.final / simCount) * 100),
      winPct: round2((s.champion / simCount) * 100),
    };
  }

  const topContenders = Object.values(teamStats)
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 20);

  return {
    teamStats,
    simCount,
    topContenders,
    liveResultsApplied,
    completedMatchCount: completedMatches.length,
    eloMatchesApplied,
    knockoutResultsApplied: knockoutCompleted.length,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export { formatSimResultsForPrompt } from "./wcAdvancementMarket.js";
