/**
 * Shared NBA UR Take context slimming — client + API use the same shapes to cut token load.
 */

/** All teams currently in the ESPN playoff bracket (union of series away/home). */
export function collectPlayoffBracketTeamAbbrevs(playoffSeries) {
  const set = new Set();
  for (const s of playoffSeries || []) {
    const h = String(s?.home || "").trim().toUpperCase();
    const a = String(s?.away || "").trim().toUpperCase();
    if (h && h !== "UNK") set.add(h);
    if (a && a !== "UNK") set.add(a);
  }
  return set;
}

/**
 * Strip verbose player row fields for LLM JSON (PRA floor/ceiling per stat removed — praFloor/praCeiling cover range).
 * @param {object} p
 */
export function slimNbaPlayerStatRowForUrTake(p) {
  if (!p || typeof p !== "object") return p;
  const rg = Array.isArray(p.recentGames) ? p.recentGames.slice(0, 5) : [];
  return {
    playerId: p.playerId ?? null,
    name: p.name,
    team: p.team,
    position: p.position || "",
    pts: p.pts ?? null,
    reb: p.reb ?? null,
    ast: p.ast ?? null,
    stl: p.stl ?? null,
    blk: p.blk ?? null,
    pf: p.pf ?? null,
    min: p.min ?? null,
    fg_pct: p.fg_pct ?? null,
    fg3_pct: p.fg3_pct ?? null,
    ft_pct: p.ft_pct ?? null,
    games_played: p.games_played ?? null,
    season: p.season ?? null,
    source: p.source,
    statsNote: p.statsNote,
    tonightGame: p.tonightGame,
    recentGames: rg,
    praSeason: p.praSeason ?? null,
    praRecent: p.praRecent ?? null,
    praFloor: p.praFloor ?? null,
    praCeiling: p.praCeiling ?? null,
  };
}

/** ESPN playoff rows without per-game combined-point arrays (avg + count only). */
export function slimPlayoffSeriesForBoard(rows) {
  return (rows || []).map((r) => ({
    round: r.round,
    home: r.home,
    away: r.away,
    homeWins: r.homeWins,
    awayWins: r.awayWins,
    status: r.status,
    completedGamesCombinedPointsAverage: r.completedGamesCombinedPointsAverage ?? null,
    completedGamesCombinedPointsCount:
      typeof r.completedGamesCombinedPointsCount === "number"
        ? r.completedGamesCombinedPointsCount
        : Array.isArray(r.completedGamesCombinedPoints)
          ? r.completedGamesCombinedPoints.length
          : 0,
  }));
}
