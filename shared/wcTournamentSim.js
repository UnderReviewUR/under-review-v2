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

// ── Knockout bracket ──

/**
 * R32 matchups per FIFA 2026 bracket structure.
 * Group winners (1st) and runners-up (2nd) from each group + 8 best 3rd.
 * Simplified bracket: 1A vs 3C/D/E, 2A vs 2B, etc. (FIFA exact bracket TBD;
 * using a balanced seeding: group winners vs 3rd/runners from different groups).
 *
 * @param {Map<string, Array<{team, points, gd, gf}>>} groupResults
 * @param {Array<object>} bestThird
 * @returns {Array<[object, object]>} 16 R32 matchups
 */
function buildR32Bracket(groupResults, bestThird) {
  const winners = [];
  const runnersUp = [];
  for (const letter of "ABCDEFGHIJKL") {
    const standings = groupResults.get(letter);
    if (!standings || standings.length < 2) continue;
    winners.push(standings[0].team);
    runnersUp.push(standings[1].team);
  }

  // Balanced seeding: winners from top half vs runners/3rd from bottom half and vice versa
  // Simplified: pair winner[i] vs runner[11-i], then 3rd place fills remaining 8 slots
  const bracket = [];

  // 8 matches: group winners vs runners-up from cross groups
  for (let i = 0; i < 6; i++) {
    bracket.push([winners[i], runnersUp[11 - i]]);
  }
  for (let i = 6; i < 12; i++) {
    bracket.push([winners[i], runnersUp[11 - i]]);
  }

  // 8 matches: remaining runners vs best 3rd (already have 12 pairs above — need 16 total)
  // Actually: 12 winners + 12 runners = 24, + 8 thirds = 32 → 16 R32 matches.
  // We have 12 winner-vs-runner pairs above. Need 4 more matches using the 8 best-3rd.
  // Pair them: 3rd[0] vs 3rd[7], 3rd[1] vs 3rd[6], etc.
  for (let i = 0; i < 4; i++) {
    bracket.push([bestThird[i], bestThird[7 - i]]);
  }

  return bracket;
}

/**
 * Simulate knockout rounds from R32 to Final.
 * @param {Array<[object, object]>} r32Bracket
 * @param {Map<string, object>} tracker — accumulates round-reach per team
 * @returns {object} tournament winner
 */
function simulateKnockout(r32Bracket, tracker) {
  let currentRound = r32Bracket;
  const roundNames = ["r32", "r16", "qf", "sf", "final"];
  let roundIdx = 0;

  while (currentRound.length > 0) {
    const roundName = roundNames[roundIdx] || `round_${roundIdx}`;
    const nextRound = [];

    for (const [teamA, teamB] of currentRound) {
      // Track that both teams reached this round
      const tA = tracker.get(teamA.abbreviation);
      const tB = tracker.get(teamB.abbreviation);
      if (tA) tA[roundName] = (tA[roundName] || 0) + 1;
      if (tB) tB[roundName] = (tB[roundName] || 0) + 1;

      const result = simulateMatch(teamA, teamB, false); // no draws in knockout
      nextRound.push(result.winner);
    }

    if (nextRound.length === 1) {
      // Final winner
      const champ = nextRound[0];
      const tc = tracker.get(champ.abbreviation);
      if (tc) tc.champion = (tc.champion || 0) + 1;
      return champ;
    }

    // Pair winners for next round
    currentRound = [];
    for (let i = 0; i < nextRound.length; i += 2) {
      if (i + 1 < nextRound.length) {
        currentRound.push([nextRound[i], nextRound[i + 1]]);
      }
    }
    roundIdx++;
  }

  return null;
}

// ── Main simulation ──

/**
 * @typedef {object} TeamSimStats
 * @property {string} abbreviation
 * @property {string} name
 * @property {number} eloRating
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
 * @param {{ simCount?: number, completedMatches?: Array<Record<string, unknown>> }} [opts]
 * @returns {{ teamStats: Record<string, TeamSimStats>, simCount: number, topContenders: TeamSimStats[], liveResultsApplied: boolean, completedMatchCount: number }}
 */
export function simulateTournament(teams = WC_2026_TEAMS, opts = {}) {
  const simCount = opts.simCount || 10000;
  const teamList = teams || WC_2026_TEAMS;
  const completedMatches = completedWcMatchesFromList(opts.completedMatches || []);
  const liveResultsApplied = completedMatches.length > 0;

  // Group teams by group letter
  /** @type {Map<string, Array<object>>} */
  const groupMap = new Map();
  for (const t of teamList) {
    if (!groupMap.has(t.group)) groupMap.set(t.group, []);
    groupMap.get(t.group).push(t);
  }

  // Initialize tracker
  /** @type {Map<string, {advance: number, r32: number, r16: number, qf: number, sf: number, final: number, champion: number}>} */
  const tracker = new Map();
  for (const t of teamList) {
    tracker.set(t.abbreviation, {
      advance: 0, r32: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0,
    });
  }

  for (let sim = 0; sim < simCount; sim++) {
    // 1. Simulate all group stages
    /** @type {Map<string, Array<{team, points, gd, gf}>>} */
    const groupResults = new Map();
    const allThirdPlace = [];

    for (const [letter, groupTeams] of groupMap) {
      const groupCompleted = completedMatchesForGroup(groupTeams, completedMatches);
      const standings = simulateGroupStage(groupTeams, groupCompleted);
      groupResults.set(letter, standings);

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

    // 2. Select 8 best 3rd-place teams
    const bestThird = selectBestThirdPlace(allThirdPlace);
    for (const t of bestThird) {
      const tc = tracker.get(t.abbreviation);
      if (tc) tc.advance++;
    }

    // 3. Build R32 bracket and simulate knockout
    const r32Bracket = buildR32Bracket(groupResults, bestThird);
    simulateKnockout(r32Bracket, tracker);
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
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Format simulation results for UR Take prompt injection.
 * @param {ReturnType<typeof simulateTournament>} simResults
 * @param {string[]} [mentionedTeams]
 * @returns {string}
 */
export function formatSimResultsForPrompt(simResults, mentionedTeams = []) {
  const mentioned = new Set((mentionedTeams || []).map((t) => t.toUpperCase()));
  const liveNote = simResults.liveResultsApplied
    ? ` · ${simResults.completedMatchCount} FT result(s) locked in`
    : "";
  const lines = [
    `TOURNAMENT SIMULATION (${simResults.simCount.toLocaleString()} Monte Carlo sims — Poisson goal model + Elo${liveNote}):`,
  ];

  // Show mentioned teams first, then top contenders
  const shown = new Set();

  if (mentioned.size) {
    lines.push("  Cited teams:");
    for (const abbr of mentioned) {
      const s = simResults.teamStats[abbr];
      if (!s) continue;
      shown.add(abbr);
      lines.push(
        `    ${s.abbreviation} (${s.name}): advance ${s.advancePct}% · QF ${s.qfPct}% · SF ${s.sfPct}% · Final ${s.finalPct}% · Win ${s.winPct}%`,
      );
    }
  }

  lines.push("  Top contenders:");
  for (const s of simResults.topContenders) {
    if (shown.has(s.abbreviation)) continue;
    shown.add(s.abbreviation);
    lines.push(
      `    ${s.abbreviation}: Win ${s.winPct}% · Final ${s.finalPct}% · SF ${s.sfPct}% · QF ${s.qfPct}%`,
    );
    if (shown.size >= 15) break;
  }

  return lines.join("\n");
}
