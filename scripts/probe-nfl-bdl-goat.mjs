#!/usr/bin/env node
/**
 * Live probe — every NFL GOAT contract endpoint on BALLDONTLIE_API_KEY.
 *
 * Trial: 5 req/min — default pacing is ~13s between calls.
 *
 * Usage:
 *   npm run probe:nfl-bdl-goat
 *   npm run probe:nfl-bdl-goat -- --week 1 --season 2026
 *   npm run probe:nfl-bdl-goat -- --briefcase   # full buildNflGoatBriefcase soak (slow)
 */
import "dotenv/config";
import { NFL_GOAT_CONTRACT_FIELDS } from "../shared/nflGoatExtractionContract.js";
import {
  nflBdlFetch,
  nflBdlQueryParams,
  buildNflGoatBriefcase,
  fetchNflBdlWeekGames,
  fetchNflBdlWeekOdds,
  fetchNflBdlOpeningOdds,
  fetchNflBdlPlayerPropsForGame,
  fetchNflBdlPlayerInjuries,
  fetchNflBdlSlateRosters,
  fetchNflBdlStandings,
  fetchNflBdlSeasonStats,
  fetchNflBdlRecentPlayerStats,
  fetchNflBdlAdvancedStats,
  fetchNflBdlPlaysForGame,
  fetchNflBdlDefenseMap,
  fetchNflBdlActivePlayers,
  fetchNflBdlTeamStats,
  fetchNflBdlDfsSlates,
  fetchNflBdlDfsDraftables,
  fetchNflBdlFantasyScoringFormats,
  fetchNflBdlFantasyProjections,
  fetchNflBdlFantasyWeeklyStats,
  fetchNflBdlFantasyRankings,
  fetchNflBdlFantasyAdp,
  fetchNflBdlTeams,
  getNflBdlApiKey,
  isNflBdlPrimaryEnabled,
} from "../api/_nflBdl.js";

const args = process.argv.slice(2);
const season = Number(getArg("--season", inferDefaultNflSeason()));
const week = Number(getArg("--week", "1"));
const paceMs = Number(getArg("--pace-ms", "13000"));
const runBriefcase = args.includes("--briefcase");

function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}

function inferDefaultNflSeason() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return String(m >= 3 ? y : y - 1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Array<{ id: string, source: string, run: () => Promise<{ ok: boolean, count?: number, status?: number, error?: string|null, note?: string }> }>} */
const checks = [];

function register(id, source, run) {
  checks.push({ id, source, run });
}

async function main() {
  const key = getNflBdlApiKey();
  if (!key) {
    console.error(JSON.stringify({ ok: false, error: "BALLDONTLIE_API_KEY missing" }, null, 2));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        event: "nfl_bdl_goat_probe_start",
        season,
        week,
        nflBdlPrimary: isNflBdlPrimaryEnabled(),
        paceMs,
        contractFields: NFL_GOAT_CONTRACT_FIELDS.length,
      },
      null,
      2,
    ),
  );

  let games = [];
  let sampleGameId = null;
  let samplePlayerId = null;
  let sampleTeamAbbr = null;

  register("games", "games", async () => {
    const res = await fetchNflBdlWeekGames({ season, week });
    games = res.games;
    sampleGameId = games[0]?.providerGameId ?? null;
    return { ok: res.ok, status: res.status, count: games.length, error: res.error };
  });

  register("odds", "odds", async () => {
    const res = await fetchNflBdlWeekOdds({ season, week });
    if (!sampleGameId && res.rows[0]?.game_id != null) sampleGameId = res.rows[0].game_id;
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  register("odds/opening", "odds/opening", async () => {
    const res = await fetchNflBdlOpeningOdds({ season, week });
    return {
      ok: res.ok,
      status: res.status,
      count: res.rows.length,
      error: res.error,
      note: res.rows.length ? null : "endpoint reachable — opening rows may be empty pre-kickoff",
    };
  });

  register("odds/player_props", "odds/player_props", async () => {
    if (!sampleGameId) {
      const odds = await nflBdlFetch("/odds", { season, week });
      sampleGameId = odds.data?.data?.[0]?.game_id ?? null;
    }
    if (!sampleGameId) return { ok: false, count: 0, error: "no sample game_id" };
    const props = await fetchNflBdlPlayerPropsForGame(sampleGameId);
    samplePlayerId = props.find((p) => p.playerId != null)?.playerId ?? null;
    return { ok: props.length > 0, count: props.length, note: `game_id ${sampleGameId}` };
  });

  register("player_injuries", "player_injuries", async () => {
    const rows = await fetchNflBdlPlayerInjuries();
    return { ok: rows.length > 0, count: rows.length };
  });

  register("teams/{id}/roster", "teams/{id}/roster", async () => {
    if (!games.length) {
      const g = await fetchNflBdlWeekGames({ season, week });
      games = g.games;
    }
    const res = await fetchNflBdlSlateRosters(games.slice(0, 2), { season });
    sampleTeamAbbr = Object.keys(res.rostersByTeam)[0] ?? games[0]?.homeAbbr ?? null;
    return {
      ok: res.ok,
      status: res.status,
      count: res.teamCount,
      error: res.error,
      note: sampleTeamAbbr ? `sample team ${sampleTeamAbbr}` : null,
    };
  });

  register("team_season_stats", "team_season_stats", async () => {
    const def = await fetchNflBdlDefenseMap({ season, useCache: false });
    return {
      ok: Object.keys(def.defenseByTeam || {}).length > 0,
      count: Object.keys(def.defenseByTeam || {}).length,
      note: def.source || null,
    };
  });

  register("standings", "standings", async () => {
    const res = await fetchNflBdlStandings({ season });
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  register("season_stats", "season_stats", async () => {
    const params = { season, per_page: 5 };
    if (samplePlayerId) params.player_ids = [samplePlayerId];
    const rows = await fetchNflBdlSeasonStats({
      season,
      playerIds: samplePlayerId ? [samplePlayerId] : [],
    });
    return {
      ok: true,
      count: rows.length,
      note: rows.length ? null : "endpoint live — season stats sparse before Week 1 box scores",
    };
  });

  register("stats", "stats", async () => {
    const rows = await fetchNflBdlRecentPlayerStats({
      seasons: [season, season - 1],
      playerIds: samplePlayerId ? [samplePlayerId] : [],
    });
    if (!samplePlayerId) {
      const res = await nflBdlFetch("/stats", { season, per_page: 3, season_type: 2 });
      const count = Array.isArray(res.data?.data) ? res.data.data.length : 0;
      return { ok: res.ok, status: res.status, count, error: res.error };
    }
    return { ok: rows.length >= 0, count: rows.length };
  });

  register("advanced_stats/*", "advanced_stats/*", async () => {
    const res = await fetchNflBdlAdvancedStats({
      season,
      playerIds: samplePlayerId ? [samplePlayerId] : [],
      maxPlayers: samplePlayerId ? 1 : 0,
    });
    const count = res.passing.length + res.rushing.length + res.receiving.length;
    return {
      ok: res.ok,
      status: res.status,
      count,
      error: res.error,
      note: count ? null : "endpoint live — advanced rows sparse until regular-season samples",
    };
  });

  register("plays", "plays", async () => {
    if (!sampleGameId) return { ok: true, count: 0, note: "no sample game_id" };
    const res = await fetchNflBdlPlaysForGame(sampleGameId, { maxPages: 1 });
    return {
      ok: res.ok,
      status: res.status,
      count: res.rows.length,
      error: res.error,
      note: res.rows.length ? null : "endpoint live — plays empty until in-progress game",
    };
  });

  register("teams", "teams", async () => {
    const rows = await fetchNflBdlTeams();
    return { ok: rows.length > 0, count: rows.length };
  });

  register("active_players", "active_players", async () => {
    const res = await fetchNflBdlActivePlayers();
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  register("team_stats", "team_stats", async () => {
    if (!sampleGameId) return { ok: true, count: 0, note: "no sample game_id" };
    const res = await fetchNflBdlTeamStats({ season, gameIds: [sampleGameId] });
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  register("dfs/slates", "dfs/slates", async () => {
    const res = await fetchNflBdlDfsSlates({ season, week });
    return { ok: res.ok, status: res.status, count: res.slates.length, error: res.error };
  });

  register("dfs/draftables", "dfs/draftables", async () => {
    const slates = await fetchNflBdlDfsSlates({ season, week });
    const slateId = slates.slates[0]?.id;
    if (!slateId) return { ok: true, count: 0, note: "no slate for week" };
    const res = await fetchNflBdlDfsDraftables({ slateId });
    return { ok: res.ok, status: res.status, count: res.rows.length, note: `slate ${slateId}` };
  });

  register("fantasy/scoring_formats", "fantasy/scoring_formats", async () => {
    const res = await fetchNflBdlFantasyScoringFormats({ season });
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  register("fantasy/projections", "fantasy/projections", async () => {
    const res = await fetchNflBdlFantasyProjections({
      season,
      week,
      playerIds: samplePlayerId ? [samplePlayerId] : [],
    });
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  register("fantasy/weekly_stats", "fantasy/weekly_stats", async () => {
    const res = await fetchNflBdlFantasyWeeklyStats({
      season: season - 1,
      week: 1,
      playerIds: samplePlayerId ? [samplePlayerId] : [],
    });
    return {
      ok: res.ok,
      status: res.status,
      count: res.rows.length,
      error: res.error,
      note: "2025 W1 sample — current week may be empty pre-kickoff",
    };
  });

  register("fantasy/rankings", "fantasy/rankings", async () => {
    const res = await fetchNflBdlFantasyRankings({
      season,
      playerIds: samplePlayerId ? [samplePlayerId] : [],
    });
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  register("fantasy/adp", "fantasy/adp", async () => {
    const res = await fetchNflBdlFantasyAdp({
      season,
      playerIds: samplePlayerId ? [samplePlayerId] : [],
    });
    return { ok: res.ok, status: res.status, count: res.rows.length, error: res.error };
  });

  /** @type {Record<string, unknown>} */
  const report = {};
  let failed = 0;

  for (const check of checks) {
    try {
      const result = await check.run();
      report[check.id] = { source: check.source, ...result };
      const endpointOk = result.ok !== false && (result.status == null || result.status < 400);
      if (!endpointOk) failed += 1;
      console.log(
        JSON.stringify({
          endpoint: check.id,
          source: check.source,
          ok: endpointOk,
          ...result,
        }),
      );
    } catch (err) {
      failed += 1;
      report[check.id] = { source: check.source, ok: false, error: err?.message || String(err) };
      console.log(JSON.stringify({ endpoint: check.id, ok: false, error: err?.message || String(err) }));
    }
    await sleep(paceMs);
  }

  /** @type {Record<string, boolean>} */
  const contractMap = {};
  for (const field of NFL_GOAT_CONTRACT_FIELDS) {
    const key = field.source.replace(/\{id\}/, "id");
    contractMap[field.key] = Boolean(
      report[field.source]?.ok ||
        report[key]?.ok ||
        (field.source.startsWith("advanced_stats") && report["advanced_stats/*"]?.ok) ||
        (field.source.startsWith("teams/") && report["teams/{id}/roster"]?.ok),
    );
  }

  let briefcaseSummary = null;
  if (runBriefcase) {
    process.env.NFL_BDL_PRIMARY = process.env.NFL_BDL_PRIMARY || "1";
    const briefcase = await buildNflGoatBriefcase({
      week,
      season,
      hydrateDefense: true,
      hydrateInjuries: true,
      hydrateStats: true,
      hydrateDfs: true,
      hydrateFantasy: true,
    });
    briefcaseSummary = {
      eliteReady: briefcase.coverage?.eliteReady,
      requiredPct: briefcase.coverage?.requiredPct,
      fields: briefcase.coverage?.fields,
      endpoints: briefcase.coverage?.endpoints,
      gameCount: briefcase.slate?.games?.length ?? 0,
      oddsCount: briefcase.slate?.odds?.length ?? 0,
      propCount: briefcase.slate?.playerProps?.length ?? 0,
      rosterTeams: Object.keys(briefcase.league?.rostersByTeam || {}).length,
    };
  }

  const bracketSelfTest = nflBdlQueryParams({ team_ids: [7, 8], player_ids: [1] });
  const summary = {
    ok: failed === 0,
    failedEndpoints: failed,
    season,
    week,
    nflBdlPrimary: isNflBdlPrimaryEnabled(),
    bracketParams: bracketSelfTest,
    contractFieldsReachable: contractMap,
    report,
    briefcase: briefcaseSummary,
  };

  console.log(JSON.stringify({ event: "nfl_bdl_goat_probe_done", ...summary }, null, 2));
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err?.message || String(err) }, null, 2));
  process.exit(1);
});
