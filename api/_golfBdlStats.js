/**
 * BDL PGA strokes-gained enrichment — tournament round stats, season stats, durable id cache.
 */
import { bdlFetch } from "./_balldontlie.js";
import { classifySgCoverage } from "./_dataCoverage.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { getStaticPlayerSG } from "./_golfStaticSg.js";
import { attachPlayerIdsToRows, normalizePlayerKey, resolveIdFromNameLookup } from "./_playerIdentity.js";

const ID_CACHE_TTL = 7 * 24 * 60 * 60;
const STAT_CACHE_TTL = 6 * 60 * 60;
const MAX_IDS_PER_ROUND_STATS = 12;
const MAX_IDS_PER_SEASON_STATS = 15;

async function safeBdlFetch(path, params = {}) {
  const apiKey = getEnv("BALLDONTLIE_API_KEY") || "";
  if (!apiKey) return { ok: false, data: null, error: "missing_key" };
  return bdlFetch(`/pga/v1${path}`, params, { apiKey, timeoutMs: 12000 });
}

function extractSeasonStatAvg(statValueArr) {
  if (!Array.isArray(statValueArr)) return null;
  const avg = statValueArr.find((s) => String(s?.statName || "").toLowerCase() === "avg");
  if (!avg) return null;
  const v = parseFloat(String(avg?.statValue ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(v) ? v : null;
}

/**
 * @param {object[]} dataRows — BDL player_season_stats rows
 * @returns {Map<number, { sg_total, sg_app, sg_putt, statsSource }>}
 */
export function pivotBdlSeasonStatRows(dataRows) {
  const byPlayer = new Map();
  for (const row of dataRows || []) {
    const pid = row?.player?.id;
    if (pid == null) continue;
    if (!byPlayer.has(pid)) {
      byPlayer.set(pid, { statsSource: "balldontlie_season" });
    }
    const bucket = byPlayer.get(pid);
    const statName = String(row?.stat_name || "").toLowerCase();
    const val = extractSeasonStatAvg(row?.stat_value);
    if (val == null) continue;
    if (statName.includes("sg") && statName.includes("total") && !statName.includes("tee-to-green")) {
      bucket.sg_total = val;
    } else if (statName.includes("approach")) {
      bucket.sg_app = val;
    } else if (statName.includes("putting")) {
      bucket.sg_putt = val;
    }
  }
  return byPlayer;
}

function mapRoundStatRow(row) {
  if (!row || typeof row !== "object") return null;
  const sg_total = row.sg_total != null ? Number(row.sg_total) : null;
  const sg_app = row.sg_approach != null ? Number(row.sg_approach) : null;
  const sg_putt = row.sg_putting != null ? Number(row.sg_putting) : null;
  if (![sg_total, sg_app, sg_putt].some((v) => Number.isFinite(v))) return null;
  return {
    sg_total: Number.isFinite(sg_total) ? sg_total : null,
    sg_app: Number.isFinite(sg_app) ? sg_app : null,
    sg_putt: Number.isFinite(sg_putt) ? sg_putt : null,
    statsSource: "balldontlie_tournament",
  };
}

/**
 * @param {Array<{ playerId?: number|null, player?: string, display_name?: string }>} tournamentResults
 * @returns {Map<string, number>}
 */
export function buildNameToBdlPlayerIdMap(tournamentResults) {
  const map = new Map();
  for (const row of tournamentResults || []) {
    const id = row?.playerId ?? row?.player?.id ?? row?.raw?.player?.id ?? null;
    const name = String(
      row?.player ||
        row?.raw?.player?.display_name ||
        row?.display_name ||
        row?.name ||
        "",
    ).trim();
    if (id == null || !name) continue;
    const numId = Number(id);
    map.set(normalizePlayerKey(name), numId);
    const last = name.split(/\s+/).pop();
    if (last) map.set(normalizePlayerKey(last), numId);
  }
  return map;
}

async function resolveBdlPlayerIdBySearch(name) {
  const label = String(name || "").trim();
  if (!label) return null;
  const cacheKey = `golf_bdl_pid:${normalizePlayerKey(label)}`;
  const cached = await getDurableJson(cacheKey);
  if (cached?.id != null) return Number(cached.id);

  const last = label.split(/\s+/).filter(Boolean).pop() || label;
  const res = await safeBdlFetch("/players", { search: last, per_page: 8 });
  if (!res.ok || !Array.isArray(res.data?.data)) return null;

  let best = null;
  for (const p of res.data.data) {
    const disp = String(p?.display_name || `${p?.first_name || ""} ${p?.last_name || ""}`).trim();
    const pk = normalizePlayerKey(disp);
    const lk = normalizePlayerKey(label);
    if (pk === lk || pk.includes(lk) || lk.includes(pk)) {
      best = p;
      break;
    }
    if (normalizePlayerKey(p?.last_name || "") === normalizePlayerKey(last)) {
      best = best || p;
    }
  }
  if (!best?.id) return null;
  await setDurableJson(cacheKey, { id: best.id, display_name: best.display_name }, { ttlSeconds: ID_CACHE_TTL });
  return Number(best.id);
}

async function fetchTournamentSgByPlayerIds(tournamentId, playerIds) {
  const map = new Map();
  if (tournamentId == null || !playerIds.length) return map;

  const chunks = [];
  for (let i = 0; i < playerIds.length; i += MAX_IDS_PER_ROUND_STATS) {
    chunks.push(playerIds.slice(i, i + MAX_IDS_PER_ROUND_STATS));
  }

  for (const chunk of chunks) {
    const params = {
      "tournament_ids[]": [tournamentId],
      "player_ids[]": chunk,
      round_number: -1,
      per_page: 100,
    };
    const res = await safeBdlFetch("/player_round_stats", params);
    if (!res.ok || !Array.isArray(res.data?.data)) continue;
    for (const row of res.data.data) {
      const pid = row?.player?.id;
      if (pid == null) continue;
      const mapped = mapRoundStatRow(row);
      if (mapped) map.set(Number(pid), mapped);
    }
  }
  return map;
}

async function fetchSeasonSgByPlayerIds(playerIds, season) {
  const map = new Map();
  if (!playerIds.length) return map;
  const yr = Number(season) || new Date().getFullYear();

  const chunks = [];
  for (let i = 0; i < playerIds.length; i += MAX_IDS_PER_SEASON_STATS) {
    chunks.push(playerIds.slice(i, i + MAX_IDS_PER_SEASON_STATS));
  }

  for (const chunk of chunks) {
    const cacheKey = `golf_bdl_season_sg:${yr}:${chunk.sort((a, b) => a - b).join(",")}`;
    const cached = await getDurableJson(cacheKey);
    if (cached && typeof cached === "object") {
      for (const [k, v] of Object.entries(cached)) {
        map.set(Number(k), v);
      }
      continue;
    }

    const res = await safeBdlFetch("/player_season_stats", {
      "player_ids[]": chunk,
      season: yr,
      per_page: 100,
    });
    if (!res.ok || !Array.isArray(res.data?.data)) continue;

    const pivoted = pivotBdlSeasonStatRows(res.data.data);
    const serial = {};
    for (const [pid, bundle] of pivoted.entries()) {
      map.set(pid, bundle);
      serial[pid] = bundle;
    }
    if (Object.keys(serial).length > 0) {
      await setDurableJson(cacheKey, serial, { ttlSeconds: STAT_CACHE_TTL });
    }
  }
  return map;
}

function applyStaticFallback(row) {
  const label = row?.name || row?.player || "";
  const sg = getStaticPlayerSG(label);
  if (!sg) {
    return {
      ...row,
      sg_total: row.sg_total ?? null,
      sg_app: row.sg_app ?? null,
      sg_putt: row.sg_putt ?? null,
      statsSource: row.statsSource || "none",
      statsCoverage: classifySgCoverage(row),
      sg_note: row.sg_note || "SG not available",
    };
  }
  const merged = {
    ...row,
    sg_total: row.sg_total ?? sg.sg_total ?? null,
    sg_app: row.sg_app ?? sg.sg_app ?? null,
    sg_putt: row.sg_putt ?? sg.sg_putt ?? null,
    statsSource: row.statsSource || "static_season",
    sg_note: row.sg_note || "season SG (static)",
  };
  merged.statsCoverage = classifySgCoverage(merged);
  return merged;
}

function mergeSgOntoRow(row, bundle) {
  if (!bundle) return applyStaticFallback(row);
  const merged = {
    ...row,
    sg_total: bundle.sg_total ?? row.sg_total ?? null,
    sg_app: bundle.sg_app ?? row.sg_app ?? null,
    sg_putt: bundle.sg_putt ?? row.sg_putt ?? null,
    statsSource: bundle.statsSource || row.statsSource,
    sg_note:
      bundle.statsSource === "balldontlie_tournament"
        ? "SG (BDL tournament)"
        : bundle.statsSource === "balldontlie_season"
          ? "SG (BDL season)"
          : row.sg_note,
  };
  merged.statsCoverage = classifySgCoverage(merged);
  if (merged.statsCoverage === "leaderboard_only") {
    return applyStaticFallback(row);
  }
  return merged;
}

/**
 * Enrich leaderboard rows: BDL tournament SG → BDL season SG → static PGA_PLAYERS.
 * @param {object[]} rows
 * @param {object} opts
 * @param {number|null} [opts.tournamentId]
 * @param {number} [opts.season]
 * @param {Map<string, number>} [opts.nameToPlayerId]
 * @param {number} [opts.maxPlayers=40]
 */
export async function enrichGolfLeaderboardWithStats(rows, opts = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const season = Number(opts.season) || new Date().getFullYear();
  const tournamentId = opts.tournamentId != null ? Number(opts.tournamentId) : null;
  const nameToPlayerId = opts.nameToPlayerId instanceof Map ? opts.nameToPlayerId : new Map();
  const maxPlayers = Number(opts.maxPlayers) > 0 ? Number(opts.maxPlayers) : 40;

  let withIds = attachPlayerIdsToRows(rows, nameToPlayerId);

  const unresolved = withIds
    .filter((r) => r.playerId == null && (r.name || r.player))
    .slice(0, 20);
  for (const row of unresolved) {
    const label = row?.name || row?.player;
    const id = await resolveBdlPlayerIdBySearch(label);
    if (id != null) {
      nameToPlayerId.set(normalizePlayerKey(label), id);
      const last = String(label).split(/\s+/).pop();
      if (last) nameToPlayerId.set(normalizePlayerKey(last), id);
    }
  }
  withIds = attachPlayerIdsToRows(withIds, nameToPlayerId);

  const priorityIds = [];
  const seen = new Set();
  for (const row of withIds.slice(0, maxPlayers)) {
    const id = row?.playerId;
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    priorityIds.push(Number(id));
  }

  let tournamentSg = new Map();
  if (tournamentId != null && priorityIds.length > 0) {
    try {
      tournamentSg = await fetchTournamentSgByPlayerIds(tournamentId, priorityIds);
    } catch (err) {
      console.warn("[golf] BDL tournament SG fetch:", err?.message || err);
    }
  }

  const needSeason = priorityIds.filter((id) => !tournamentSg.has(id));
  let seasonSg = new Map();
  if (needSeason.length > 0) {
    try {
      seasonSg = await fetchSeasonSgByPlayerIds(needSeason, season);
    } catch (err) {
      console.warn("[golf] BDL season SG fetch:", err?.message || err);
    }
  }

  return withIds.map((row) => {
    const pid = row?.playerId != null ? Number(row.playerId) : null;
    let bundle = pid != null ? tournamentSg.get(pid) : null;
    if (!bundle && pid != null) bundle = seasonSg.get(pid);
    const enriched = mergeSgOntoRow(row, bundle);
    if (pid != null && enriched.playerId == null) {
      return { ...enriched, playerId: pid };
    }
    return enriched;
  });
}

export { resolveIdFromNameLookup };
