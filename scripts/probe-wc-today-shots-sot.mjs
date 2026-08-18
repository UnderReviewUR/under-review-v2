/**
 * Live BDL probe — today's WC fixtures: shots + SOT coverage (no KV write, no deploy).
 * Usage: node scripts/probe-wc-today-shots-sot.mjs
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
try {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
} catch {
  console.warn("No .env loaded — set BALLDONTLIE_API_KEY in environment.");
}

import { fetchAllMatchesBdl, bdlFifaFetch } from "../api/_wcBdlFifa.js";
import { normalizeBdlPlayerPropsToMarkets } from "../api/_wcBdlNormalize.js";
import { resolveBdlPlayerLookupForPropRows } from "../api/_wcBdlData.js";
import { matchPlayerPropRowsFromEvent } from "../shared/wcMatchPlayerProps.js";
import { wcTodayEtYmd } from "../shared/wcKickoffDisplay.js";

const todayEt = wcTodayEtYmd();
const slate = await fetchAllMatchesBdl();
const allMatches = slate?.matches || [];

const todayMatches = allMatches.filter((m) => {
  const d = String(m.date || "").slice(0, 10);
  return d === todayEt;
});

console.log(`=== WC matches today (ET ${todayEt}) ===`);
console.log("slate total:", allMatches.length, "| today:", todayMatches.length);
if (!todayMatches.length) {
  console.log("No matches on slate for today — listing next 7 days for context:");
  const byDate = new Map();
  for (const m of allMatches) {
    const d = String(m.date || "").slice(0, 10);
    if (!d) continue;
    byDate.set(d, (byDate.get(d) || 0) + 1);
  }
  [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 14)
    .forEach(([d, n]) => console.log(`  ${d}: ${n} matches`));
  process.exit(0);
}

/** @type {Array<Record<string, unknown>>} */
const results = [];

for (const fixture of todayMatches) {
  const label = `${fixture.homeTeam} vs ${fixture.awayTeam}`;
  const bdlMatchId = Number(fixture.bdlMatchId ?? fixture.id);
  if (!Number.isFinite(bdlMatchId)) {
    results.push({ label, error: "no_bdl_match_id" });
    continue;
  }

  const res = await bdlFifaFetch("/odds/player_props", { match_id: bdlMatchId });
  const rows = Array.isArray(res.data?.data) ? res.data.data : [];

  const rawShots = rows.filter((r) => r.prop_type === "shots").length;
  const rawSot = rows.filter((r) => r.prop_type === "shots_on_target").length;
  const rawAny = rows.filter((r) => r.prop_type === "anytime_goal").length;

  if (!res.ok) {
    results.push({ label, bdlMatchId, error: res.error || "fetch_failed" });
    continue;
  }

  const playerLookup = await resolveBdlPlayerLookupForPropRows(rows, {
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
  });
  const markets = normalizeBdlPlayerPropsToMarkets(rows, playerLookup);
  const payload = {
    eventId: String(fixture.id),
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    lastUpdated: Date.now(),
    source: "balldontlie",
    markets,
  };

  const shotRows = matchPlayerPropRowsFromEvent(payload, "player_shots_ou", 999);
  const sotRows = matchPlayerPropRowsFromEvent(payload, "player_sot_ou", 999);

  const uniqueShotPlayers = [...new Set(shotRows.map((r) => r.name))].sort();
  const uniqueSotPlayers = [...new Set(sotRows.map((r) => r.name))].sort();

  const sampleShots = pickPreferredLineSample(shotRows, 4);
  const sampleSot = pickPreferredLineSample(sotRows, 4);

  const missingLookupRisk =
    (rawShots > 0 && shotRows.length === 0) || (rawSot > 0 && sotRows.length === 0);

  results.push({
    label,
    bdlMatchId,
    status: fixture.status,
    time: fixture.time || "",
    rawTotal: rows.length,
    rawShots,
    rawSot,
    rawAnytime: rawAny,
    lookupSize: Object.keys(playerLookup).length,
    normShots: shotRows.length,
    normSot: sotRows.length,
    uniqueShotPlayers: uniqueShotPlayers.length,
    uniqueSotPlayers: uniqueSotPlayers.length,
    missingLookupRisk,
    sampleShots,
    sampleSot,
  });
}

console.log("\n=== Per-match summary ===\n");
for (const r of results) {
  if (r.error) {
    console.log(`${r.label}: ERROR — ${r.error}`);
    continue;
  }
  const flag = r.missingLookupRisk ? " ⚠ LOOKUP DROP" : "";
  console.log(
    `${r.label} (${r.status}${r.time ? ` ${r.time}` : ""}) — bdl ${r.bdlMatchId}${flag}`,
  );
  console.log(
    `  raw: ${r.rawTotal} total | shots ${r.rawShots} | SOT ${r.rawSot} | anytime ${r.rawAnytime}`,
  );
  console.log(
    `  normalized: shots ${r.normShots} (${r.uniqueShotPlayers} players) | SOT ${r.normSot} (${r.uniqueSotPlayers} players) | lookup ${r.lookupSize}`,
  );
  if (r.sampleShots?.length) {
    console.log(
      `  shots sample: ${r.sampleShots.map(fmtSample).join(" | ")}`,
    );
  } else if (r.rawShots > 0) {
    console.log("  shots sample: (none after normalize — lookup issue?)");
  } else {
    console.log("  shots sample: (none in BDL raw)");
  }
  if (r.sampleSot?.length) {
    console.log(`  SOT sample:   ${r.sampleSot.map(fmtSample).join(" | ")}`);
  } else if (r.rawSot > 0) {
    console.log("  SOT sample:   (none after normalize — lookup issue?)");
  } else {
    console.log("  SOT sample:   (none in BDL raw)");
  }
  console.log("");
}

const ok = results.filter((r) => !r.error);
const withShots = ok.filter((r) => r.normShots > 0);
const withSot = ok.filter((r) => r.normSot > 0);
const rawShotsOnly = ok.filter((r) => r.rawShots > 0);
const rawSotOnly = ok.filter((r) => r.rawSot > 0);

console.log("=== Totals ===");
console.log(`Matches probed: ${results.length} (${ok.length} ok)`);
console.log(
  `Shots: ${withShots.length}/${ok.length} matches have normalized lines (${rawShotsOnly.length}/${ok.length} have raw BDL shots)`,
);
console.log(
  `SOT:   ${withSot.length}/${ok.length} matches have normalized lines (${rawSotOnly.length}/${ok.length} have raw BDL SOT)`,
);
console.log(
  `Lookup drops: ${ok.filter((r) => r.missingLookupRisk).length} matches (raw exists but normalize empty)`,
);

function pickPreferredLineSample(rows, max = 4) {
  const byName = new Map();
  for (const r of rows) {
    const name = String(r.name || "");
    if (!name) continue;
    const line = Number(r.line);
    const existing = byName.get(name);
    const preferred =
      !Number.isFinite(line) ||
      Math.abs(line - 0.5) < 0.01 ||
      Math.abs(line - 1.5) < 0.01;
    if (!existing || (preferred && !existing.preferred)) {
      byName.set(name, { ...r, preferred });
    }
  }
  return [...byName.values()]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .slice(0, max);
}

function fmtSample(r) {
  const line = r.line != null ? r.line : "?";
  return `${r.name} O${line} ${r.americanOdds}`;
}
