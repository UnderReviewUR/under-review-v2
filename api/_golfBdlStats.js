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
const bdlTierSkipLogged = new Set();

function logBdlTierSkipOnce(key, detail) {
  if (bdlTierSkipLogged.has(key)) return;
  bdlTierSkipLogged.add(key);
  console.warn(JSON.stringify({ event: "bdl_tier_endpoint_skipped", sport: "pga", key, detail }));
}

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

  const nameToPlayerId = opts.nameToPlayerId instanceof Map ? opts.nameToPlayerId : new Map();
  const maxPlayers = Number(opts.maxPlayers) > 0 ? Number(opts.maxPlayers) : 40;

  let withIds = attachPlayerIdsToRows(rows, nameToPlayerId);

  const unresolved = withIds
    .filter((r) => r.playerId == null && (r.name || r.player))
    .slice(0, Math.min(20, maxPlayers));
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

  logBdlTierSkipOnce(
    "player_round_and_season_stats",
    "Skipped /pga/v1/player_round_stats and /pga/v1/player_season_stats because current BDL plan is PGA All-Star; using leaderboard plus static SG fallback.",
  );

  return withIds.map((row) => {
    const pid = row?.playerId != null ? Number(row.playerId) : null;
    const enriched = mergeSgOntoRow(row, null);
    if (pid != null && enriched.playerId == null) {
      return { ...enriched, playerId: pid };
    }
    return enriched;
  });
}

export { resolveIdFromNameLookup };
