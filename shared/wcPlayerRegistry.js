/**
 * World Cup 2026 — tournament player registry merge + identity helpers.
 */

import { normalizeEspnAbbr } from "../api/_wcEspn.js";
import { WC_PLAYER_SEED } from "../src/data/wc2026PlayerSeed.js";
import { WC_FULL_SQUAD_SEED } from "../src/data/wc2026FullSquadsSeed.js";

/**
 * @param {string} name
 */
export function normalizeWcPlayerName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Strip diacritics for stable key matching (Mbappé → Mbappe, Aït-Nouri → Ait-Nouri).
 * @param {string} s
 */
function stripDiacritics(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * @param {string} name
 */
export function playerRegistryKey(name, nationAbbr) {
  const n = stripDiacritics(normalizeWcPlayerName(name)).toLowerCase();
  const team = normalizeEspnAbbr(nationAbbr);
  return `${team}|${n}`;
}

/**
 * @param {number} [nowMs]
 */
export function createEmptyPlayerRegistry(nowMs = Date.now()) {
  return {
    lastUpdated: nowMs,
    source: "static",
    teams: /** @type {Record<string, { abbr: string, displayName?: string, players: import("./wc2026PlayerConstants.js").WcRegistryPlayer[] }>} */ ({}),
  };
}

/**
 * @param {import("./wc2026PlayerConstants.js").WcRegistryPlayer} existing
 * @param {Partial<import("./wc2026PlayerConstants.js").WcRegistryPlayer>} incoming
 */
export function mergeRegistryPlayer(existing, incoming) {
  const goalsTournament = Math.max(
    Number(existing.goalsTournament) || 0,
    Number(incoming.goalsTournament) || 0,
  );
  const assistsTournament = Math.max(
    Number(existing.assistsTournament) || 0,
    Number(incoming.assistsTournament) || 0,
  );

  return {
    espnAthleteId: incoming.espnAthleteId || existing.espnAthleteId || null,
    name: incoming.name || existing.name,
    position: incoming.position || existing.position || null,
    nationAbbr: incoming.nationAbbr || existing.nationAbbr,
    isStarterLikely: Boolean(incoming.isStarterLikely || existing.isStarterLikely),
    goalsTournament,
    assistsTournament,
    injuryStatus: incoming.injuryStatus ?? existing.injuryStatus ?? null,
    lastSeenEventId: incoming.lastSeenEventId || existing.lastSeenEventId || null,
  };
}

/**
 * @param {Record<string, unknown>} registry
 * @param {string} nationAbbr
 * @param {Partial<import("./wc2026PlayerConstants.js").WcRegistryPlayer>} player
 */
export function upsertRegistryPlayer(registry, nationAbbr, player) {
  const abbr = normalizeEspnAbbr(nationAbbr);
  const name = normalizeWcPlayerName(player.name);
  if (!abbr || !name) return registry;

  if (!registry.teams) registry.teams = {};
  if (!registry.teams[abbr]) {
    registry.teams[abbr] = { abbr, players: [] };
  }

  const team = registry.teams[abbr];
  const key = playerRegistryKey(name, abbr);
  const idx = team.players.findIndex((p) => playerRegistryKey(p.name, p.nationAbbr) === key);

  const row = {
    espnAthleteId: player.espnAthleteId != null ? String(player.espnAthleteId) : null,
    name,
    position: player.position ? String(player.position) : null,
    nationAbbr: abbr,
    isStarterLikely: Boolean(player.isStarterLikely),
    goalsTournament: Number(player.goalsTournament) || 0,
    assistsTournament: Number(player.assistsTournament) || 0,
    injuryStatus: player.injuryStatus ? String(player.injuryStatus) : null,
    lastSeenEventId: player.lastSeenEventId ? String(player.lastSeenEventId) : null,
  };

  if (idx >= 0) {
    team.players[idx] = mergeRegistryPlayer(team.players[idx], row);
  } else {
    team.players.push(row);
  }

  return registry;
}

/** Position normalizer: FIFA PDF uses GK/DF/MF/FW; ESPN uses single-letter codes. */
const POS_NORMALIZE = { G: "GK", D: "DF", M: "MF", F: "FW" };

/**
 * Full 48×26 FIFA squad registry from versioned static seed.
 * @param {number} [nowMs]
 */
export function buildRegistryFromFifaStatic(nowMs = Date.now()) {
  const registry = createEmptyPlayerRegistry(nowMs);
  seedRegistryFromStaticList(registry);
  registry.lastUpdated = nowMs;
  return registry;
}

/**
 * Static squads as baseline; overlay KV stats/lineup fields when present.
 * @param {Record<string, unknown> | null | undefined} kvRegistry
 * @param {number} [nowMs]
 */
export function buildResolvedWcPlayerRegistry(kvRegistry, nowMs = Date.now()) {
  const base = buildRegistryFromFifaStatic(nowMs);
  if (!kvRegistry?.teams || !Object.keys(kvRegistry.teams).length) {
    return base;
  }

  for (const [abbr, team] of Object.entries(kvRegistry.teams)) {
    for (const row of team?.players || []) {
      if (!row?.name) continue;
      upsertRegistryPlayer(base, abbr, row);
    }
  }

  const kvUpdated = Number(kvRegistry.lastUpdated);
  if (Number.isFinite(kvUpdated) && kvUpdated > 0) {
    base.lastUpdated = kvUpdated;
  }

  const kvSource = String(kvRegistry.source || "").trim();
  if (kvSource && kvSource !== base.source) {
    base.source = kvSource.includes(base.source) ? kvSource : `${base.source}+${kvSource}`;
  }

  return base;
}

/**
 * Seed registry from official FIFA 26-man squad lists (1,248 players across 48 teams).
 * Falls back to the smaller notable-player seed if full squads are unavailable.
 * @param {Record<string, unknown>} registry
 */
export function seedRegistryFromStaticList(registry) {
  const hasFullSquads = WC_FULL_SQUAD_SEED.length > 0;
  const seed = hasFullSquads ? WC_FULL_SQUAD_SEED : WC_PLAYER_SEED;

  for (const row of seed) {
    const pos = row.position ? (POS_NORMALIZE[row.position] || row.position) : null;
    upsertRegistryPlayer(registry, row.nationAbbr, {
      name: row.name,
      position: pos,
      isStarterLikely: false,
      goalsTournament: 0,
      assistsTournament: 0,
    });
  }
  registry.source = hasFullSquads
    ? (registry.source === "static" ? "fifa_static" : `${registry.source}+fifa_static`)
    : (registry.source === "static" ? "static" : `${registry.source}+seed`);
  return registry;
}

/**
 * @param {Record<string, unknown> | null | undefined} detail
 */
export function upsertRegistryFromMatchDetail(registry, detail) {
  if (!detail || typeof detail !== "object") return registry;

  const eventId = detail.eventId != null ? String(detail.eventId) : null;
  const homeTeam = normalizeEspnAbbr(detail.homeTeam);
  const awayTeam = normalizeEspnAbbr(detail.awayTeam);
  const lineupConfirmed = detail.lineupConfirmed === true;

  /** @type {Array<[string, string, unknown[]]>} */
  const sides = [
    ["home", homeTeam, detail.players?.home],
    ["away", awayTeam, detail.players?.away],
  ];

  for (const [, teamAbbr, rows] of sides) {
    if (!teamAbbr || !Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row?.name) continue;
      upsertRegistryPlayer(registry, teamAbbr, {
        espnAthleteId: row.espnAthleteId,
        name: row.name,
        position: row.position,
        isStarterLikely: lineupConfirmed && Boolean(row.starter),
        goalsTournament: Number(row.goals) || 0,
        assistsTournament: Number(row.assists) || 0,
        lastSeenEventId: eventId,
      });
    }
  }

  const lineups = detail.lineups;
  if (lineups && lineupConfirmed) {
    for (const [ha, teamAbbr] of [
      ["home", homeTeam],
      ["away", awayTeam],
    ]) {
      const side = lineups[ha];
      if (!teamAbbr || !side) continue;
      for (const lp of side.starters || []) {
        if (!lp?.name) continue;
        upsertRegistryPlayer(registry, teamAbbr, {
          espnAthleteId: lp.espnAthleteId,
          name: lp.name,
          position: lp.position,
          isStarterLikely: true,
          lastSeenEventId: eventId,
        });
      }
    }
  }

  return registry;
}

/**
 * @param {Record<string, unknown>} registry
 */
export function countRegistryPlayers(registry) {
  const teams = registry?.teams || {};
  let total = 0;
  for (const t of Object.values(teams)) {
    total += Array.isArray(t?.players) ? t.players.length : 0;
  }
  return { teamCount: Object.keys(teams).length, playerCount: total };
}

/**
 * Top scorers across tournament registry (for structural fallback).
 * @param {Record<string, unknown> | null | undefined} registry
 * @param {number} [limit]
 */
export function topRegistryScorers(registry, limit = 12) {
  const teams = registry?.teams || {};
  /** @type {import("./wc2026PlayerConstants.js").WcRegistryPlayer[]} */
  const all = [];
  for (const t of Object.values(teams)) {
    for (const p of t?.players || []) {
      all.push(p);
    }
  }
  return all
    .sort(
      (a, b) =>
        (Number(b.goalsTournament) || 0) - (Number(a.goalsTournament) || 0) ||
        (b.isStarterLikely ? 1 : 0) - (a.isStarterLikely ? 1 : 0),
    )
    .slice(0, limit);
}
