/**
 * Machine-readable coverage summaries for sport boards / UR Take payloads.
 */

/**
 * @param {Array<{ statsCoverage?: string, sg_total?: unknown, playerStats?: unknown, recentGames?: unknown }>} rows
 * @param {object} [opts]
 * @param {string} [opts.domain] — e.g. golf_leaderboard, nba_player_stats
 * @param {string} [opts.primarySource]
 */
export function summarizeStatCoverage(rows, opts = {}) {
  const list = Array.isArray(rows) ? rows : [];
  let full = 0;
  let partial = 0;
  let leaderboardOnly = 0;
  const missingNames = [];

  for (const row of list) {
    const cov = String(row?.statsCoverage || "").toLowerCase();
    if (cov === "full") {
      full++;
      continue;
    }
    if (cov === "partial") {
      partial++;
      continue;
    }
    if (cov === "leaderboard_only" || cov === "none") {
      leaderboardOnly++;
      const label = row?.name || row?.player || row?.displayName;
      if (label) missingNames.push(String(label).trim());
    }
  }

  return {
    domain: opts.domain || "generic",
    primarySource: opts.primarySource || null,
    rowCount: list.length,
    playersWithFullStats: full,
    playersWithPartialStats: partial,
    playersLeaderboardOnly: leaderboardOnly,
    missingStatLabels: missingNames.slice(0, 12),
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * @param {object} p
 * @param {string} p.sport
 * @param {object} [p.board] — sport-specific board fragment
 */
export function buildSportDataCoverage({ sport, board = {} }) {
  const s = String(sport || "").toLowerCase();

  if (s === "golf") {
    const lb = board?.currentEvent?.leaderboard || [];
    const playerStats = summarizeStatCoverage(lb, {
      domain: "golf_leaderboard",
      primarySource: board?.sourceMeta?.board || board?.sourceMeta?.playerStats || null,
    });
    return {
      sport: "golf",
      event: board?.currentEvent?.name || null,
      leaderboard: playerStats,
      oddsPresent: Boolean(board?.odds?.outrights?.length),
      rankingsPresent: Boolean(board?.rankings?.length),
    };
  }

  if (s === "nba") {
    const ps = Array.isArray(board?.playerStats) ? board.playerStats : [];
    const withRecent = ps.filter((r) => Array.isArray(r?.recentGames) && r.recentGames.length > 0).length;
    const withSeason = ps.filter((r) => r?.seasonAvg || r?.pts != null).length;
    return {
      sport: "nba",
      playerStatsRows: ps.length,
      playersWithRecentGames: withRecent,
      playersWithSeasonBaselines: withSeason,
      injuriesPresent: Boolean(board?.injuries?.length),
      propLinesPresent: Boolean(board?.propLines?.length),
      bdlGroundingPresent: Boolean(board?.bdlGrounding?.bdlGroundedPlayers),
    };
  }

  if (s === "mlb") {
    return {
      sport: "mlb",
      gamesPresent: Boolean(board?.games?.length),
      propLinesPresent: Boolean(board?.propLines?.length),
      gameTotalsKeys: board?.gameTotals ? Object.keys(board.gameTotals).length : 0,
      injuriesPresent: Boolean(board?.injuries?.length),
      pitcherStatsTextPresent: Boolean(board?.seasonContext?.mlbPitcherStatsText),
      primarySource: board?.primarySource || null,
    };
  }

  if (s === "f1") {
    return {
      sport: "f1",
      standingsPresent: Boolean(board?.standings?.length),
      schedulePresent: Boolean(board?.schedule?.races?.length),
      sessionPresent: Boolean(board?.session),
      weatherPresent: Boolean(board?.weather),
    };
  }

  return { sport: s || "unknown", note: "no coverage schema" };
}

/**
 * Classify a strokes-gained / stat bundle for a single player row.
 * @param {{ sg_total?: unknown, sg_app?: unknown, sg_putt?: unknown }} sg
 */
export function classifySgCoverage(sg) {
  const total = sg?.sg_total;
  const app = sg?.sg_app;
  const putt = sg?.sg_putt;
  const hasTotal = total != null && total !== "" && Number.isFinite(Number(total));
  const hasAny = hasTotal || (app != null && app !== "") || (putt != null && putt !== "");
  if (hasTotal) return "full";
  if (hasAny) return "partial";
  return "leaderboard_only";
}
