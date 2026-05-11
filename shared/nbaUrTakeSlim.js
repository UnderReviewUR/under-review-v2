/**
 * Shared NBA UR Take context slimming — client + API use the same shapes to cut token load.
 */

/**
 * Raw BDL stat row: true when the player logged playable minutes (keep when building last-N logs).
 * Filters DNP / null minutes / zero clock before slicing to five games.
 */
export function bdlStatRowHasPlayingTime(row) {
  if (!row || typeof row !== "object") return false;
  if (row.did_not_play === true) return false;
  if (row.active === false) return false;
  const m = row.min;
  if (m === null || m === undefined) return false;
  if (m === 0 || m === "0") return false;
  const s = String(m).trim();
  if (s === "" || s === "00:00" || s === "0:00") return false;
  const colon = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (colon) {
    const mm = Number(colon[1]);
    const ss = Number(colon[2]);
    return mm > 0 || ss > 0;
  }
  const n = Number(m);
  return Number.isFinite(n) && n > 0;
}

/**
 * Normalized recent game log entry: true when pts+reb+ast are all zero due to DNP / no minutes / flags —
 * exclude from recent-form PRA averages (never treat as "played" zeros).
 * False when stats are non-zero, or when minutes show the player actually played (even if the box is 0-0-0).
 */
export function isNbaRecentGameZeroStatDnpLike(g) {
  const pts = Number(g?.pts ?? 0);
  const reb = Number(g?.reb ?? 0);
  const ast = Number(g?.ast ?? 0);
  if (pts + reb + ast !== 0) return false;
  if (g?.did_not_play === true) return true;
  if (g?.active === false) return true;
  const m = g?.min;
  if (m === null || m === undefined) return true;
  if (m === 0 || m === "0") return true;
  const s = String(m).trim();
  if (s === "" || s === "00:00" || s === "0:00") return true;
  const colon = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (colon) {
    const mm = Number(colon[1]);
    const ss = Number(colon[2]);
    return mm === 0 && ss === 0;
  }
  const n = Number(m);
  return Number.isFinite(n) && n === 0;
}

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
    recentGamesStale: p.recentGamesStale === true,
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
