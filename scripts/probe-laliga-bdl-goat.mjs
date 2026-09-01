#!/usr/bin/env node
/**
 * Live probe — La Liga GOAT contract endpoints on BALLDONTLIE_API_KEY.
 * Usage: npm run probe:laliga-bdl-goat
 */
import "dotenv/config";
import {
  fetchLaligaMatches,
  fetchLaligaOdds,
  fetchLaligaOpeningOdds,
  fetchLaligaPlayerPropsForMatch,
  fetchLaligaStandings,
  fetchLaligaInjuries,
  fetchLaligaRosters,
  fetchLaligaMatchEvents,
  fetchLaligaMatchLineups,
  fetchLaligaPlayerMatchStats,
  buildLaligaGoatBriefcase,
  isLaligaBdlPrimaryEnabled,
} from "../api/_laligaBdl.js";

const season = Number(process.argv.includes("--season") ? process.argv[process.argv.indexOf("--season") + 1] : 2025);
const paceMs = 13000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dateWindow(days = 10) {
  const out = [];
  const base = new Date();
  for (let i = -1; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

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
  const dates = dateWindow(12);
  console.log(JSON.stringify({ event: "laliga_probe_start", season, dates: dates.slice(0, 3), primary: isLaligaBdlPrimaryEnabled() }));
  let ok = 0;
  let fail = 0;
  let matches = [];
  let sampleMatchId = null;

  if (await run("matches", async () => {
    const res = await fetchLaligaMatches({ season, dates });
    matches = res.matches;
    sampleMatchId = matches[0]?.providerMatchId ?? null;
    return { ok: res.ok, count: matches.length, error: res.error };
  })) ok++; else fail++;
  await sleep(paceMs);

  const matchIds = matches.map((m) => m.providerMatchId).filter(Boolean).slice(0, 8);

  if (await run("odds", async () => {
    const res = await fetchLaligaOdds({ matchIds, dates });
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("odds/opening", async () => {
    const res = await fetchLaligaOpeningOdds({ matchIds, dates });
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("odds/player_props", async () => {
    if (!sampleMatchId) return { ok: false, count: 0, error: "no match_id" };
    const props = await fetchLaligaPlayerPropsForMatch(sampleMatchId);
    return { ok: props.length > 0, count: props.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("standings", async () => {
    const res = await fetchLaligaStandings({ season });
    return { ok: res.ok, count: res.rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("player_injuries", async () => {
    const rows = await fetchLaligaInjuries();
    return { ok: rows.length > 0, count: rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("rosters", async () => {
    const res = await fetchLaligaRosters({ season });
    return { ok: res.ok, count: Object.keys(res.rostersByTeam).length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("match_events", async () => {
    const rows = await fetchLaligaMatchEvents(matchIds.slice(0, 3));
    return { ok: true, count: rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("match_lineups", async () => {
    const rows = await fetchLaligaMatchLineups(matchIds.slice(0, 3));
    return { ok: true, count: rows.length };
  })) ok++; else fail++;
  await sleep(paceMs);

  if (await run("player_match_stats", async () => {
    const rows = await fetchLaligaPlayerMatchStats(matchIds.slice(0, 2));
    return { ok: true, count: rows.length };
  })) ok++; else fail++;

  if (process.argv.includes("--briefcase")) {
    process.env.LALIGA_BDL_PRIMARY = process.env.LALIGA_BDL_PRIMARY || "1";
    const b = await buildLaligaGoatBriefcase({ season, matchIds });
    console.log(JSON.stringify({
      event: "laliga_briefcase",
      matches: b.slate?.matches?.length ?? 0,
      props: b.slate?.playerProps?.length ?? 0,
      endpoints: b.coverage?.endpoints,
    }));
  }

  console.log(JSON.stringify({ event: "laliga_probe_done", ok: fail === 0, passed: ok, failed: fail }));
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
