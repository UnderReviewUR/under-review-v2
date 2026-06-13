/**
 * Post-match Elo updates for WC tournament sim (Phase 1 live freshness).
 * Applies completed FT scores in chronological order on top of static seed ratings.
 */

/** Standard international K — conservative for tournament sim stability. */
export const WC_ELO_K_FACTOR = 40;

/**
 * @param {number} eloA
 * @param {number} eloB
 */
export function expectedEloScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * @param {number} goalsA
 * @param {number} goalsB
 * @returns {0 | 0.5 | 1}
 */
export function matchScoreForElo(goalsA, goalsB) {
  if (goalsA > goalsB) return 1;
  if (goalsA < goalsB) return 0;
  return 0.5;
}

/**
 * @param {number} eloA
 * @param {number} eloB
 * @param {0 | 0.5 | 1} scoreA
 * @param {number} [kFactor]
 */
export function updateEloPair(eloA, eloB, scoreA, kFactor = WC_ELO_K_FACTOR) {
  const expectedA = expectedEloScore(eloA, eloB);
  const nextA = eloA + kFactor * (scoreA - expectedA);
  const nextB = eloB + kFactor * ((1 - scoreA) - (1 - expectedA));
  return { eloA: nextA, eloB: nextB };
}

/**
 * @param {Record<string, unknown>} match
 */
function matchSortKey(match) {
  const ts = Number(match?.commenceTs);
  if (Number.isFinite(ts) && ts > 0) return ts;
  const parsed = Date.parse(String(match?.date || "").slice(0, 10));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * @param {Record<string, unknown>} match
 */
function readMatchGoals(match) {
  if (
    match?.homeScore != null &&
    match?.awayScore != null &&
    Number.isFinite(Number(match.homeScore)) &&
    Number.isFinite(Number(match.awayScore))
  ) {
    return {
      home: Number(match.homeScore),
      away: Number(match.awayScore),
      homeAbbr: String(match.homeTeam || "").toUpperCase(),
      awayAbbr: String(match.awayTeam || "").toUpperCase(),
    };
  }
  return null;
}

/**
 * Clone team list and apply sequential Elo updates from completed matches.
 * @param {Array<{ abbreviation: string, eloRating: number, isHost?: boolean, [key: string]: unknown }>} teams
 * @param {Array<Record<string, unknown>>} completedMatches — FT / AET / PEN with scores
 * @param {{ kFactor?: number }} [opts]
 */
export function applyPostMatchEloToTeams(teams, completedMatches = [], opts = {}) {
  const kFactor = opts.kFactor ?? WC_ELO_K_FACTOR;
  /** @type {Map<string, { team: Record<string, unknown>, eloRating: number }>} */
  const byAbbr = new Map();
  for (const t of teams || []) {
    const abbr = String(t.abbreviation || "").toUpperCase();
    if (!abbr) continue;
    byAbbr.set(abbr, { team: { ...t }, eloRating: Number(t.eloRating) || 1500 });
  }

  const sorted = [...(completedMatches || [])].sort((a, b) => matchSortKey(a) - matchSortKey(b));
  let matchesApplied = 0;
  let lastMatchMs = 0;

  for (const m of sorted) {
    const goals = readMatchGoals(m);
    if (!goals) continue;
    const home = byAbbr.get(goals.homeAbbr);
    const away = byAbbr.get(goals.awayAbbr);
    if (!home || !away) continue;

    const scoreHome = matchScoreForElo(goals.home, goals.away);
    const { eloA, eloB } = updateEloPair(home.eloRating, away.eloRating, scoreHome, kFactor);
    home.eloRating = eloA;
    away.eloRating = eloB;
    matchesApplied += 1;
    lastMatchMs = Math.max(lastMatchMs, matchSortKey(m));
  }

  const updatedTeams = (teams || []).map((t) => {
    const row = byAbbr.get(String(t.abbreviation || "").toUpperCase());
    if (!row) return { ...t };
    return { ...t, eloRating: Math.round(row.eloRating) };
  });

  return {
    teams: updatedTeams,
    matchesApplied,
    lastMatchMs: matchesApplied > 0 ? lastMatchMs : 0,
  };
}
