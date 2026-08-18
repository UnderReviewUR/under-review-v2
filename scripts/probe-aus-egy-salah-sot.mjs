/**
 * Live BDL probe — AUS vs EGY Salah SOT (no deploy, no KV write).
 * Usage: node scripts/probe-aus-egy-salah-sot.mjs
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
import {
  normalizeBdlPlayerPropsToMarkets,
  buildBdlPlayerIdLookup,
} from "../api/_wcBdlNormalize.js";
import { resolveBdlPlayerLookupForPropRows } from "../api/_wcBdlData.js";
import { findWcNamedPlayerPropLegMatch } from "../shared/wcPlayerPropFixture.js";
import { buildWcNamedPlayerPropsStructured } from "../shared/wcPlayerMarketResolve.js";
import { matchPlayerPropRowsFromEvent } from "../shared/wcMatchPlayerProps.js";

const slate = await fetchAllMatchesBdl();
const matches = slate?.matches || [];
const ausEgy = matches.filter((m) => {
  const h = String(m.homeTeam || "").toUpperCase();
  const a = String(m.awayTeam || "").toUpperCase();
  return (h === "AUS" && a === "EGY") || (h === "EGY" && a === "AUS");
});

console.log("=== AUS vs EGY on BDL slate ===");
console.log("count:", ausEgy.length);
for (const m of ausEgy) {
  console.log(
    JSON.stringify({
      id: m.id,
      bdlMatchId: m.bdlMatchId,
      home: m.homeTeam,
      away: m.awayTeam,
      status: m.status,
      date: m.date,
      round: m.round,
    }),
  );
}

const fixture = ausEgy[0];
if (!fixture?.bdlMatchId) {
  console.error("No AUS vs EGY fixture with bdlMatchId on slate.");
  process.exit(1);
}

const bdlMatchId = Number(fixture.bdlMatchId);
const res = await bdlFifaFetch("/odds/player_props", { match_id: bdlMatchId });
const rawCount = Array.isArray(res.data?.data) ? res.data.data.length : 0;
console.log("\n=== BDL /odds/player_props ===");
console.log("ok:", res.ok, "status:", res.status, "raw rows:", rawCount);
if (!res.ok) {
  console.error("error:", res.error);
  process.exit(1);
}

const playerLookup = await resolveBdlPlayerLookupForPropRows(res.data.data, {
  homeTeam: fixture.homeTeam,
  awayTeam: fixture.awayTeam,
});
console.log("player lookup size:", Object.keys(playerLookup).length);

const markets = normalizeBdlPlayerPropsToMarkets(res.data.data, playerLookup);
const payload = {
  eventId: String(fixture.id),
  homeTeam: fixture.homeTeam,
  awayTeam: fixture.awayTeam,
  lastUpdated: Date.now(),
  source: "balldontlie",
  markets,
};

const sotRows = matchPlayerPropRowsFromEvent(payload, "player_sot_ou", 999);
const salahRows = sotRows.filter((r) => /salah/i.test(String(r.name || "")));

console.log("\n=== Normalized SOT board ===");
console.log("total SOT rows:", sotRows.length);
console.log(
  "Salah rows:",
  salahRows.map((r) => ({
    name: r.name,
    line: r.line,
    odds: r.americanOdds,
    nation: r.nationAbbr,
  })),
);

const hit = findWcNamedPlayerPropLegMatch(
  {
    name: "Salah",
    threshold: "",
    marketKey: "player_sot_ou",
    marketLabel: "shots on target",
  },
  payload,
);

console.log("\n=== App matcher (findWcNamedPlayerPropLegMatch) ===");
console.log(
  hit
    ? {
        name: hit.row?.name,
        odds: hit.row?.americanOdds,
        line: hit.row?.line,
        market: hit.marketKey,
      }
    : "NO MATCH",
);

const structured = buildWcNamedPlayerPropsStructured(
  "How many shots will Salah get on target?",
  "verified",
  { matchPlayerProps: payload, wcEventId: String(fixture.id) },
  {
    wcEventId: String(fixture.id),
    requiredEntities: [fixture.homeTeam, fixture.awayTeam],
  },
);

console.log("\n=== UR Take prebuilt output ===");
console.log("call:", structured?.call);
console.log("lean:", structured?.lean);
