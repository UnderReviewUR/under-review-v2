/**
 * Live ESPN Fantasy rankings hydrate (PPR / Superflex / Standard draft ranks + ownership).
 * KV key: nfl_espn_fantasy_rankings
 */
import { getDurableJson, setDurableJson } from "./_durableStore.js";

export const NFL_FANTASY_RANKINGS_KV_KEY = "nfl_espn_fantasy_rankings";
const RANKINGS_TTL_SECONDS = 7 * 24 * 60 * 60;
const RANKINGS_CACHE_FRESH_MS = 12 * 60 * 60 * 1000;
const UA = "Mozilla/5.0 (compatible; UnderReview/1.0)";

const POS_BY_ID = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DST",
};

/** Fallback ESPN fantasy proTeamId → abbr when season endpoint is unavailable. */
const PRO_TEAM_FALLBACK = {
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WAS",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Fantasy season year for ESPN FFL endpoints.
 * Jan–Feb still belong to the prior calendar year's NFL season label for completed games,
 * but draft ranks after March use the upcoming/current season year.
 * @param {Date} [now]
 */
export function nflFantasySeasonYear(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (m <= 1) return y - 1;
  return y;
}

/**
 * @param {string} abbrev
 */
function normalizeTeamAbbr(abbrev) {
  const a = String(abbrev || "").toUpperCase();
  if (a === "WSH") return "WAS";
  if (a === "JAC") return "JAX";
  return a;
}

/**
 * @param {number} seasonYear
 */
async function fetchProTeamMap(seasonYear) {
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}?view=proTeamSchedules_wl`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return { ...PRO_TEAM_FALLBACK };
  const json = await res.json();
  const teams = json?.settings?.proTeams || json?.proTeams || [];
  /** @type {Record<number, string>} */
  const map = { ...PRO_TEAM_FALLBACK };
  for (const t of teams) {
    const id = Number(t?.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    map[id] = normalizeTeamAbbr(t.abbrev);
  }
  return map;
}

/**
 * @param {number} seasonYear
 * @param {number} [limit]
 */
async function fetchEspnFantasyPlayers(seasonYear, limit = 350) {
  const filter = {
    players: {
      filterStatus: { value: ["FREEAGENT", "WAIVERS", "ONTEAM"] },
      filterSlotIds: { value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] },
      sortDraftRanks: { sortPriority: 1, sortAsc: true, value: "PPR" },
      limit,
    },
  };
  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${seasonYear}/segments/0/leaguedefaults/3?view=kona_player_info`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      "X-Fantasy-Filter": JSON.stringify(filter),
    },
  });
  if (!res.ok) {
    throw new Error(`ESPN fantasy rankings HTTP ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json?.players) ? json.players : [];
}

/**
 * @param {Record<string, unknown>} draftRank
 */
function pickRank(draftRank) {
  if (!draftRank || typeof draftRank !== "object") return null;
  const rank = Number(draftRank.rank);
  const auction = Number(draftRank.auctionValue);
  return {
    overallRank: Number.isFinite(rank) ? rank : null,
    salary: Number.isFinite(auction) ? auction : null,
  };
}

/**
 * Normalize ESPN player row → compact ranking record.
 * @param {Record<string, unknown>} row
 * @param {Record<number, string>} teamMap
 */
export function normalizeEspnFantasyPlayerRow(row, teamMap = PRO_TEAM_FALLBACK) {
  const player = row?.player && typeof row.player === "object" ? row.player : row;
  if (!player || typeof player !== "object") return null;
  const name = String(player.fullName || "").trim();
  if (!name) return null;
  const posId = Number(player.defaultPositionId);
  const pos = POS_BY_ID[posId] || null;
  if (!pos || pos === "K" || pos === "DST") return null;

  const ranks = player.draftRanksByRankType || {};
  const ppr = pickRank(ranks.PPR);
  const superflex = pickRank(ranks.SUPERFLEX);
  const standard = pickRank(ranks.STANDARD);
  const ownership = player.ownership || {};
  const teamId = Number(player.proTeamId);
  const team = teamMap[teamId] || PRO_TEAM_FALLBACK[teamId] || null;

  return {
    name,
    team,
    pos,
    pprOverall: ppr?.overallRank ?? null,
    pprSalary: ppr?.salary ?? null,
    superflexOverall: superflex?.overallRank ?? null,
    superflexSalary: superflex?.salary ?? null,
    standardOverall: standard?.overallRank ?? null,
    standardSalary: standard?.salary ?? null,
    percentOwned: ownership.percentOwned != null ? Number(ownership.percentOwned) : null,
    percentStarted: ownership.percentStarted != null ? Number(ownership.percentStarted) : null,
    adp: ownership.averageDraftPosition != null ? Number(ownership.averageDraftPosition) : null,
    injuryStatus: player.injuryStatus || (player.injured ? "INJURED" : "ACTIVE"),
    espnPlayerId: player.id ?? null,
  };
}

/**
 * Assign positional ranks (QB1, RB12, …) from overall PPR order within position.
 * @param {Array<Record<string, unknown>>} players
 */
export function assignPositionalRanks(players) {
  /** @type {Record<string, number>} */
  const counters = {};
  const sorted = [...players].sort((a, b) => {
    const ar = Number(a.pprOverall);
    const br = Number(b.pprOverall);
    if (Number.isFinite(ar) && Number.isFinite(br)) return ar - br;
    if (Number.isFinite(ar)) return -1;
    if (Number.isFinite(br)) return 1;
    return String(a.name).localeCompare(String(b.name));
  });
  for (const p of sorted) {
    const pos = String(p.pos || "UNK");
    counters[pos] = (counters[pos] || 0) + 1;
    const posRank = `${pos}${counters[pos]}`;
    p.ppr = {
      overallRank: p.pprOverall ?? null,
      posRank,
      salary: p.pprSalary ?? null,
    };
    if (p.superflexOverall != null || p.superflexSalary != null) {
      p.superflex = {
        overallRank: p.superflexOverall ?? null,
        posRank,
        salary: p.superflexSalary ?? null,
      };
    }
  }
  return sorted;
}

/**
 * @param {{ force?: boolean, seasonYear?: number, limit?: number, now?: Date }} [opts]
 */
export async function fetchNflFantasyRankingsSnapshot(opts = {}) {
  const force = Boolean(opts.force);
  if (!force) {
    const cached = await getDurableJson(NFL_FANTASY_RANKINGS_KV_KEY);
    if (cached?.fetchedAt && Date.now() - cached.fetchedAt < RANKINGS_CACHE_FRESH_MS) {
      return cached;
    }
  }

  const now = opts.now || new Date();
  const seasonYear = opts.seasonYear || nflFantasySeasonYear(now);
  const [teamMap, rawPlayers] = await Promise.all([
    fetchProTeamMap(seasonYear),
    fetchEspnFantasyPlayers(seasonYear, opts.limit || 350),
  ]);

  const normalized = [];
  for (const row of rawPlayers) {
    const rec = normalizeEspnFantasyPlayerRow(row, teamMap);
    if (rec) normalized.push(rec);
  }
  const withPos = assignPositionalRanks(normalized);

  /** @type {Record<string, Record<string, unknown>>} */
  const byKey = {};
  for (const p of withPos) {
    byKey[normalizeKey(p.name)] = p;
  }

  const previous = await getDurableJson(NFL_FANTASY_RANKINGS_KV_KEY).catch(() => null);
  const snapshot = {
    source: "espn_fantasy_leaguedefaults",
    seasonYear,
    fetchedAt: Date.now(),
    previousFetchedAt: previous?.fetchedAt || null,
    playerCount: withPos.length,
    players: withPos,
    byKey,
  };

  await setDurableJson(NFL_FANTASY_RANKINGS_KV_KEY, snapshot, {
    ttlSeconds: RANKINGS_TTL_SECONDS,
  });
  return snapshot;
}

export async function readNflFantasyRankingsSnapshot() {
  return getDurableJson(NFL_FANTASY_RANKINGS_KV_KEY);
}

/**
 * @param {string} name
 * @param {Record<string, unknown> | null} [snapshot]
 */
export function getLiveFantasyRankPlayer(name, snapshot) {
  if (!snapshot?.byKey) return null;
  return snapshot.byKey[normalizeKey(name)] || null;
}
