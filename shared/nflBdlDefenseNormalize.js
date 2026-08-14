/**
 * Normalize BDL NFL team_season_stats → defense map for matchup card / Ask.
 * Uses opponent-allowed rates (opp_*), not DVOA — ranks are relative within the payload.
 */

/**
 * @param {number} rank 1 = best defense (fewest pts/yds allowed)
 * @returns {'ELITE'|'STRONG'|'AVERAGE'|'WEAK'|'BOTTOM'}
 */
export function nflDefenseTierFromRank(rank) {
  const r = Number(rank);
  if (!Number.isFinite(r)) return "AVERAGE";
  if (r <= 6) return "ELITE";
  if (r <= 12) return "STRONG";
  if (r <= 20) return "AVERAGE";
  if (r <= 26) return "WEAK";
  return "BOTTOM";
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ season?: number|null }} [meta]
 * @returns {Record<string, Record<string, unknown>>}
 */
export function buildDefenseMapFromBdlTeamSeasonStats(rows, meta = {}) {
  const list = (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const abbr = String(row?.team?.abbreviation || row?.abbreviation || "")
        .toUpperCase()
        .trim();
      if (!/^[A-Z]{2,4}$/.test(abbr)) return null;
      const pts =
        num(row.opp_total_points_per_game) ??
        num(row.opp_points_per_game) ??
        null;
      const passYds =
        num(row.opp_passing_yards_per_game) ??
        num(row.opp_net_passing_yards_per_game) ??
        null;
      const rushYds = num(row.opp_rushing_yards_per_game) ?? null;
      const yds =
        num(row.opp_total_offensive_yards_per_game) ??
        num(row.opp_net_total_offensive_yards_per_game) ??
        (passYds != null && rushYds != null ? passYds + rushYds : null);
      const sacksPg =
        row.opp_games_played || row.games_played
          ? safeDiv(num(row.opp_passing_sacks) ?? num(row.defensive_sacks), num(row.opp_games_played) ?? num(row.games_played))
          : null;
      const intPg = safeDiv(
        num(row.defensive_interceptions) ?? num(row.opp_passing_interceptions),
        num(row.games_played) ?? num(row.opp_games_played),
      );
      return {
        abbr,
        team: String(row?.team?.full_name || row?.team?.name || abbr),
        conf: String(row?.team?.conference || ""),
        season: meta.season ?? row.season ?? null,
        ptsAllowed: pts,
        passYdsAllowed: passYds,
        rushYdsAllowed: rushYds,
        ydsAllowed: yds,
        sacksPg,
        intPg,
        gamesPlayed: num(row.games_played) ?? num(row.opp_games_played),
        raw: row,
      };
    })
    .filter(Boolean);

  const byPts = rankAsc(list, (t) => t.ptsAllowed);
  const byPass = rankAsc(list, (t) => t.passYdsAllowed);
  const byRush = rankAsc(list, (t) => t.rushYdsAllowed);

  /** @type {Record<string, Record<string, unknown>>} */
  const out = {};
  for (const t of list) {
    const overallRank = byPts.get(t.abbr) || 16;
    const passRank = byPass.get(t.abbr) || 16;
    const rushRank = byRush.get(t.abbr) || 16;
    const tier = nflDefenseTierFromRank(overallRank);
    out[t.abbr] = {
      team: t.team,
      abbr: t.abbr,
      conf: t.conf,
      season: t.season,
      source: "balldontlie_team_season_stats",
      tier,
      overall: {
        rank: overallRank,
        ptsAllowed: t.ptsAllowed,
        ydsAllowed: t.ydsAllowed,
        dvoa: null,
      },
      pass: {
        rank: passRank,
        ydsAllowed: t.passYdsAllowed,
        sacks: t.sacksPg,
        pressurePct: null,
        intPg: t.intPg,
        dvoa: null,
      },
      rush: {
        rank: rushRank,
        ydsAllowed: t.rushYdsAllowed,
        dvoa: null,
      },
      propImpact: buildPropImpactFromRanks(tier, passRank, rushRank, t),
      bettingAngles: [],
      note: `Live season defense (${t.gamesPlayed ?? "?"}g) — ranks from opponent yards/points allowed, not DVOA.`,
      gamesPlayed: t.gamesPlayed,
    };
  }
  return out;
}

/**
 * Live BDL defense wins; static fills gaps (esp. propImpact prose).
 * @param {Record<string, Record<string, unknown>>|null|undefined} live
 * @param {Record<string, Record<string, unknown>>|null|undefined} staticMap
 */
export function mergeNflDefenseMaps(live, staticMap) {
  const out = { ...(staticMap && typeof staticMap === "object" ? staticMap : {}) };
  for (const [abbr, row] of Object.entries(live || {})) {
    const prev = out[abbr] || {};
    out[abbr] = {
      ...prev,
      ...row,
      // Keep richer static propImpact prose when live only has short templates
      propImpact:
        row.propImpact && hasRichPropImpact(row.propImpact)
          ? row.propImpact
          : prev.propImpact || row.propImpact || null,
      bettingAngles:
        Array.isArray(prev.bettingAngles) && prev.bettingAngles.length
          ? prev.bettingAngles
          : row.bettingAngles || [],
      keyPlayers: prev.keyPlayers || row.keyPlayers || [],
      source: row.source || prev.source || "merged",
    };
  }
  return out;
}

function hasRichPropImpact(impact) {
  const vals = Object.values(impact || {});
  return vals.some((v) => String(v || "").length > 40);
}

function buildPropImpactFromRanks(tier, passRank, rushRank, t) {
  const passLean =
    passRank <= 10
      ? `FADE pass volume — pass D rank ${passRank} (~${t.passYdsAllowed ?? "?"} pass yds/g allowed).`
      : passRank >= 22
        ? `LEAN pass volume — soft pass D rank ${passRank} (~${t.passYdsAllowed ?? "?"} pass yds/g allowed).`
        : `NEUTRAL pass D rank ${passRank} (~${t.passYdsAllowed ?? "?"} pass yds/g allowed).`;
  const rushLean =
    rushRank <= 10
      ? `FADE rush volume — rush D rank ${rushRank} (~${t.rushYdsAllowed ?? "?"} rush yds/g allowed).`
      : rushRank >= 22
        ? `LEAN rush volume — soft rush D rank ${rushRank} (~${t.rushYdsAllowed ?? "?"} rush yds/g allowed).`
        : `NEUTRAL rush D rank ${rushRank} (~${t.rushYdsAllowed ?? "?"} rush yds/g allowed).`;
  return {
    qb: passLean,
    wr: passLean,
    te: passLean,
    rb: rushLean,
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeDiv(a, b) {
  if (a == null || b == null || !b) return null;
  return Math.round((a / b) * 100) / 100;
}

/**
 * @template T
 * @param {T[]} list
 * @param {(t: T) => number|null} getter lower = better defense
 */
function rankAsc(list, getter) {
  const scored = list
    .map((t) => ({ t, v: getter(t) }))
    .filter((x) => x.v != null && Number.isFinite(x.v))
    .sort((a, b) => a.v - b.v);
  /** @type {Map<string, number>} */
  const map = new Map();
  scored.forEach((row, i) => {
    map.set(row.t.abbr, i + 1);
  });
  return map;
}

/**
 * Infer opponent abbr from slate games for a player's team.
 * @param {Array<Record<string, unknown>>} games
 * @param {string} playerTeam
 * @returns {string|null}
 */
export function inferNflOpponentFromSlate(games, playerTeam) {
  const own = String(playerTeam || "").toUpperCase();
  if (!own) return null;
  for (const g of games || []) {
    const home = String(g?.homeAbbr || g?.home_team?.abbreviation || "").toUpperCase();
    const away = String(g?.awayAbbr || g?.visitor_team?.abbreviation || g?.away_team?.abbreviation || "").toUpperCase();
    if (home === own && away) return away;
    if (away === own && home) return home;
  }
  return null;
}

/**
 * Build a short H2H note from recent player game logs vs opponent (when present).
 * @param {string} playerName
 * @param {string} opponentAbbr
 * @param {Array<Record<string, unknown>>} recentStats
 * @returns {string|null}
 */
export function buildNflH2hNoteFromRecentStats(playerName, opponentAbbr, recentStats) {
  const name = String(playerName || "").toLowerCase();
  const opp = String(opponentAbbr || "").toUpperCase();
  if (!name || !opp) return null;
  const hits = (Array.isArray(recentStats) ? recentStats : []).filter((row) => {
    const p = String(row.player || row.player_name || row?.player?.full_name || "").toLowerCase();
    if (p && !p.includes(name.split(" ").pop() || name) && p !== name) return false;
    if (!p && String(row.playerId || "") === "") {
      /* allow if only one cluster — skip */
    }
    const vs = String(row.opponent || row.oppAbbr || row.against || "").toUpperCase();
    return vs === opp;
  });
  if (!hits.length) return null;
  const sample = hits.slice(0, 3);
  const bits = sample.map((h) => {
    const parts = [];
    if (h.rushYds != null) parts.push(`${h.rushYds} rush`);
    if (h.recYds != null) parts.push(`${h.recYds} rec`);
    if (h.passYds != null) parts.push(`${h.passYds} pass`);
    if (h.receptions != null) parts.push(`${h.receptions} recs`);
    const label = parts.length ? parts.join(", ") : "logged";
    return `${h.week != null ? `W${h.week}` : "game"}: ${label}`;
  });
  return `Recent vs ${opp} (${hits.length}g in payload): ${bits.join("; ")}.`;
}
