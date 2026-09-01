#!/usr/bin/env node
/**
 * Live probe — NCAAF GOAT contract endpoints on BALLDONTLIE_API_KEY.
 * Usage: npm run probe:ncaaf-bdl-goat
 */
import "dotenv/config";
import {
  fetchNcaafWeekGames,
  fetchNcaafWeekOdds,
  fetchNcaafOpeningOdds,
  fetchNcaafPlayerPropsForGame,
  fetchNcaafStandings,
  fetchNcaafRankings,
  fetchNcaafActivePlayers,
  fetchNcaafPlayerStats,
  fetchNcaafPlayerSeasonStats,
  fetchNcaafPlaysForGame,
  buildNcaafGoatBriefcase,
  isNcaafBdlPrimaryEnabled,
} from "../api/_ncaafBdl.js";

const season = Number(process.argv.includes("--season") ? process.argv[process.argv.indexOf("--season") + 1] : 2026);
const week = Number(process.argv.includes("--week") ? process.argv[process.argv.indexOf("--week") + 1] : 1);
const paceMs = 13000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(name, fn) {
  try {
    const result = await fn();
    console.log(JSON.stringify({ endpoint: name, ...result }));
    return result.ok !== false;
  } catch (err) {
    console.log(JSON.stringify({ endpoint: name, ok: false, error: err?.message || String(err) }));
    return false;
  }
}

async function main() {
  console.log(JSON.stringify({ event: "ncaaf_probe_start", season, week, primary: isNcaafBdlPrimaryEnabled() }));
  let ok = 0;
  let fail = 0;
  let games = [];
  let sampleGameId = null;
  let samplePlayerId = null;

  if (await run("games", async () => {
    const res = await fetchNcaafWeekGames({ season, week });
    games = res.games;
    sampleGameId = games[0]?.providerGameId ?? null;
    return { ok: res.ok, count: games.length, status: res.status, error: res.error };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("odds", async () => {
    const res = await fetchNcaafWeekOdds({ season, week });
    if (!sampleGameId && res.rows[0]?.game_id) sampleGameId = res.rows[0].game_id;
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("odds/opening", async () => {
    const res = await fetchNcaafOpeningOdds({ season, week });
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("odds/player_props", async () => {
    if (!sampleGameId) return { ok: false, count: 0, error: "no game_id" };
    const props = await fetchNcaafPlayerPropsForGame(sampleGameId);
    samplePlayerId = props.find((p) => p.playerId)?.playerId ?? null;
    return { ok: props.length > 0, count: props.length, note: `game ${sampleGameId}` };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("standings", async () => {
    const res = await fetchNcaafStandings({ season });
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("rankings", async () => {
    const res = await fetchNcaafRankings({ season, week });
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("players/active", async () => {
    const rows = await fetchNcaafActivePlayers();
    return { ok: rows.length > 0, count: rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("player_stats", async () => {
    const rows = await fetchNcaafPlayerStats({ season, playerIds: samplePlayerId ? [samplePlayerId] : [] });
    return { ok: true, count: rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("player_season_stats", async () => {
    const rows = await fetchNcaafPlayerSeasonStats({ season, playerIds: samplePlayerId ? [samplePlayerId] : [] });
    return { ok: true, count: rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("plays", async () => {
    if (!sampleGameId) return { ok: true, count: 0, note: "no game_id" };
    const res = await fetchNcaafPlaysForGame(sampleGameId, { maxPages: 1 });
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;

  if (process.argv.includes("--briefcase")) {
    process.env.NCAAF_BDL_PRIMARY = process.env.NCAAF_BDL_PRIMARY || "1";
    const b = await buildNcaafGoatBriefcase({ season, week });
    console.log(JSON.stringify({
      event: "ncaaf_briefcase",
      games: b.slate?.games?.length ?? 0,
      props: b.slate?.playerProps?.length ?? 0,
      endpoints: b.coverage?.endpoints,
    }));
  }

  console.log(JSON.stringify({ event: "ncaaf_probe_done", ok: fail === 0, passed: ok, failed: fail }));
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
