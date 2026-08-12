/**
 * Live nflverse player stats hydrate (season + last-3 + last-1 windows).
 * Prefers current fantasy season week/reg CSVs; falls back to prior season when unpublished.
 * KV key: nfl_nflverse_live_stats
 */
import zlib from "node:zlib";
import { promisify } from "node:util";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { nflFantasySeasonYear } from "./_nflEspnFantasyRankings.js";

export const NFL_NFLVERSE_LIVE_STATS_KV_KEY = "nfl_nflverse_live_stats";
const STATS_TTL_SECONDS = 10 * 24 * 60 * 60;
const STATS_CACHE_FRESH_MS = 24 * 60 * 60 * 1000;
const gunzip = promisify(zlib.gunzip);
const SKILL_POS = new Set(["QB", "RB", "WR", "TE"]);
const MAX_PLAYERS = 400;

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function num(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Minimal CSV parser that handles quoted fields.
 * @param {string} text
 */
export function parseCsv(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  let field = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) rows.push(row);
    row = [];
  };

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      pushField();
      i += 1;
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  if (field.length || row.length) {
    pushField();
    pushRow();
  }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    /** @type {Record<string, string>} */
    const obj = {};
    for (let h = 0; h < headers.length; h += 1) obj[headers[h]] = cols[h] ?? "";
    return obj;
  });
}

/**
 * @param {number} seasonYear
 * @param {"week"|"reg"} level
 */
function nflverseStatsUrl(seasonYear, level) {
  return `https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_${level}_${seasonYear}.csv.gz`;
}

/**
 * @param {string} url
 */
async function downloadGunzipCsv(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; UnderReview/1.0)", Accept: "*/*" },
    redirect: "follow",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`nflverse download HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = (await gunzip(buf)).toString("utf8");
  return parseCsv(text);
}

/**
 * Resolve season year to hydrate: prefer requested, else prior year if unpublished.
 * @param {number} preferredYear
 */
export async function resolveNflverseStatsSeason(preferredYear) {
  const weekUrl = nflverseStatsUrl(preferredYear, "week");
  const probe = await fetch(weekUrl, { method: "HEAD", redirect: "follow" });
  if (probe.ok) {
    return { seasonYear: preferredYear, fallback: false };
  }
  const prior = preferredYear - 1;
  const priorProbe = await fetch(nflverseStatsUrl(prior, "week"), {
    method: "HEAD",
    redirect: "follow",
  });
  if (priorProbe.ok) {
    return { seasonYear: prior, fallback: true, preferredYear };
  }
  throw new Error(`No nflverse week stats for ${preferredYear} or ${prior}`);
}

/**
 * @param {Array<Record<string, string>>} weekRows
 */
function aggregateFromWeekRows(weekRows) {
  /** @type {Map<string, { name: string, pos: string, team: string, weeks: Array<Record<string, number|string>> }>} */
  const byPlayer = new Map();

  for (const r of weekRows) {
    if (String(r.season_type || "REG").toUpperCase() !== "REG") continue;
    const pos = String(r.position || "").toUpperCase();
    if (!SKILL_POS.has(pos)) continue;
    const name = String(r.player_display_name || r.player_name || "").trim();
    if (!name) continue;
    const week = num(r.week);
    if (!week) continue;
    const key = normalizeKey(name);
    let entry = byPlayer.get(key);
    if (!entry) {
      entry = { name, pos, team: String(r.team || "").toUpperCase(), weeks: [] };
      byPlayer.set(key, entry);
    }
    entry.team = String(r.team || entry.team || "").toUpperCase();
    entry.weeks.push({
      week,
      opponent: String(r.opponent_team || ""),
      completions: num(r.completions),
      attempts: num(r.attempts),
      passingYards: num(r.passing_yards),
      passingTds: num(r.passing_tds),
      interceptions: num(r.passing_interceptions),
      rushingAttempts: num(r.carries ?? r.rushing_attempts),
      rushingYards: num(r.rushing_yards),
      rushingTds: num(r.rushing_tds),
      targets: num(r.targets),
      receptions: num(r.receptions),
      receivingYards: num(r.receiving_yards),
      receivingTds: num(r.receiving_tds),
      fantasyPointsPpr: num(r.fantasy_points_ppr),
    });
  }

  /** @type {Array<Record<string, unknown>>} */
  const players = [];
  for (const entry of byPlayer.values()) {
    entry.weeks.sort((a, b) => Number(a.week) - Number(b.week));
    const season = sumWindow(entry.weeks);
    const last3 = sumWindow(entry.weeks.slice(-3));
    const last1 = sumWindow(entry.weeks.slice(-1));
    const games = entry.weeks.length;
    players.push({
      name: entry.name,
      pos: entry.pos,
      team: entry.team,
      games,
      latestWeek: entry.weeks[entry.weeks.length - 1]?.week ?? null,
      season: perGameWrap(season, games),
      last3: perGameWrap(last3, Math.min(3, games)),
      last1: perGameWrap(last1, Math.min(1, games)),
      seasonPpr: season.fantasyPointsPpr,
    });
  }

  players.sort((a, b) => Number(b.seasonPpr) - Number(a.seasonPpr));
  return players.slice(0, MAX_PLAYERS);
}

/**
 * @param {Array<Record<string, number|string>>} weeks
 */
function sumWindow(weeks) {
  const out = {
    completions: 0,
    attempts: 0,
    passingYards: 0,
    passingTds: 0,
    interceptions: 0,
    rushingAttempts: 0,
    rushingYards: 0,
    rushingTds: 0,
    targets: 0,
    receptions: 0,
    receivingYards: 0,
    receivingTds: 0,
    fantasyPointsPpr: 0,
  };
  for (const w of weeks) {
    for (const k of Object.keys(out)) out[k] += num(w[k]);
  }
  return out;
}

/**
 * @param {Record<string, number>} totals
 * @param {number} games
 */
function perGameWrap(totals, games) {
  const g = Math.max(1, games);
  const round1 = (n) => Math.round((n / g) * 10) / 10;
  return {
    ...totals,
    games: g,
    passingYardsPerGame: round1(totals.passingYards),
    rushingYardsPerGame: round1(totals.rushingYards),
    receivingYardsPerGame: round1(totals.receivingYards),
    targetsPerGame: round1(totals.targets),
    receptionsPerGame: round1(totals.receptions),
    fantasyPointsPprPerGame: round1(totals.fantasyPointsPpr),
  };
}

/**
 * @param {{ force?: boolean, seasonYear?: number, now?: Date }} [opts]
 */
export async function fetchNflverseLiveStatsSnapshot(opts = {}) {
  const force = Boolean(opts.force);
  if (!force) {
    const cached = await getDurableJson(NFL_NFLVERSE_LIVE_STATS_KV_KEY);
    if (cached?.fetchedAt && Date.now() - cached.fetchedAt < STATS_CACHE_FRESH_MS) {
      return cached;
    }
  }

  const now = opts.now || new Date();
  const preferred = opts.seasonYear || nflFantasySeasonYear(now);
  const resolved = await resolveNflverseStatsSeason(preferred);
  const weekRows = await downloadGunzipCsv(nflverseStatsUrl(resolved.seasonYear, "week"));
  if (!weekRows?.length) {
    throw new Error(`Empty nflverse week stats for ${resolved.seasonYear}`);
  }

  const players = aggregateFromWeekRows(weekRows);
  /** @type {Record<string, Record<string, unknown>>} */
  const byKey = {};
  for (const p of players) byKey[normalizeKey(p.name)] = p;

  const previous = await getDurableJson(NFL_NFLVERSE_LIVE_STATS_KV_KEY).catch(() => null);
  const snapshot = {
    source: "nflverse_stats_player_week",
    seasonYear: resolved.seasonYear,
    preferredSeasonYear: preferred,
    usedPriorSeasonFallback: Boolean(resolved.fallback),
    fetchedAt: Date.now(),
    previousFetchedAt: previous?.fetchedAt || null,
    playerCount: players.length,
    maxWeek: players.reduce((m, p) => Math.max(m, Number(p.latestWeek) || 0), 0),
    players,
    byKey,
  };

  await setDurableJson(NFL_NFLVERSE_LIVE_STATS_KV_KEY, snapshot, {
    ttlSeconds: STATS_TTL_SECONDS,
  });
  return snapshot;
}

export async function readNflverseLiveStatsSnapshot() {
  return getDurableJson(NFL_NFLVERSE_LIVE_STATS_KV_KEY);
}

/**
 * @param {string} name
 * @param {Record<string, unknown> | null} [snapshot]
 */
export function getLiveNflversePlayerStats(name, snapshot) {
  if (!snapshot?.byKey) return null;
  return snapshot.byKey[normalizeKey(name)] || null;
}

/**
 * Compact prompt lines for a player.
 * @param {Record<string, unknown>} row
 */
export function formatLiveNflversePlayerStats(row) {
  if (!row) return "";
  const seasonLabel = row.seasonYearLabel || "";
  const pos = row.pos || "SKILL";
  const s = row.season || {};
  const l3 = row.last3 || {};
  const l1 = row.last1 || {};
  const parts = [`${row.name} (${pos}/${row.team || "?"}${seasonLabel ? `, ${seasonLabel}` : ""}):`];
  if (pos === "QB") {
    parts.push(
      `  Season: ${s.passingYardsPerGame} pass yds/g, ${s.passingTds} TD, ${s.interceptions} INT, ${s.rushingYardsPerGame} rush yds/g, ${s.fantasyPointsPprPerGame} PPR/g`,
    );
    parts.push(
      `  Last 3: ${l3.passingYardsPerGame} pass yds/g, ${l3.passingTds} TD, ${l3.fantasyPointsPprPerGame} PPR/g`,
    );
    parts.push(`  Last 1: ${l1.passingYards} pass yds, ${l1.passingTds} TD, ${l1.fantasyPointsPpr} PPR`);
  } else if (pos === "RB") {
    parts.push(
      `  Season: ${s.rushingYardsPerGame} rush yds/g, ${s.targetsPerGame} targets/g, ${s.receivingYardsPerGame} rec yds/g, ${s.fantasyPointsPprPerGame} PPR/g`,
    );
    parts.push(
      `  Last 3: ${l3.rushingYardsPerGame} rush yds/g, ${l3.targetsPerGame} targets/g, ${l3.fantasyPointsPprPerGame} PPR/g`,
    );
    parts.push(
      `  Last 1: ${l1.rushingYards} rush yds, ${l1.targets} targets, ${l1.fantasyPointsPpr} PPR`,
    );
  } else {
    parts.push(
      `  Season: ${s.targetsPerGame} targets/g, ${s.receptionsPerGame} rec/g, ${s.receivingYardsPerGame} rec yds/g, ${s.receivingTds} TD, ${s.fantasyPointsPprPerGame} PPR/g`,
    );
    parts.push(
      `  Last 3: ${l3.targetsPerGame} targets/g, ${l3.receivingYardsPerGame} rec yds/g, ${l3.fantasyPointsPprPerGame} PPR/g`,
    );
    parts.push(
      `  Last 1: ${l1.targets} targets, ${l1.receivingYards} rec yds, ${l1.fantasyPointsPpr} PPR`,
    );
  }
  return parts.join("\n");
}
