#!/usr/bin/env node
/**
 * USA vs AUS (event 29) — force BDL pull + dump KV propRows.
 *
 * Usage:
 *   node --env-file=.env.production.local scripts/probe-usa-aus-props-kv.mjs
 *   UR_TAKE_URL=https://preview.../api/ur-take node scripts/probe-usa-aus-props-kv.mjs --http
 */

import { getMatchesPayload } from "../api/world-cup.js";
import {
  ensureWcBdlMatchPlayerPropsForEvent,
  readWcMatchPlayerPropsForEvent,
} from "../api/_wcMatchPlayerProps.js";
import {
  hasMatchPlayerPropRows,
  matchPlayerPropRowsFromEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "../shared/wcMatchPlayerProps.js";
import { loadWcPlayerMarketKvBlocksWithRetry } from "../api/_wcPlayerUrTakeContext.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";

const EVENT_ID = String(process.env.WC_EVENT_ID || "29");
const HTTP = process.argv.includes("--http");
const UR_TAKE_URL = process.env.UR_TAKE_URL || "https://www.under-review.app/api/ur-take";

function marketCounts(payload) {
  if (!payload?.markets) return {};
  return Object.fromEntries(
    WC_MATCH_PLAYER_PROP_MARKET_KEYS.map((key) => [
      key,
      matchPlayerPropRowsFromEvent(payload, key, 999).length,
    ]).filter(([, n]) => n > 0),
  );
}

function samplePropRows(payload, limit = 12) {
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const key of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
    for (const row of matchPlayerPropRowsFromEvent(payload, key, limit)) {
      out.push({ market: key, ...row });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

async function probeHttp(question) {
  const res = await fetch(UR_TAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sportHint: "worldcup", structured: true }),
  });
  const json = await res.json();
  const s = json.structured || {};
  return {
    httpStatus: res.status,
    wcIntent: json.wcIntent,
    callType: s.callType,
    call: s.call,
    lean: s.lean,
    whyNow: s.whyNow,
    propBoardRows: s.propBoardRows?.slice?.(0, 8) || [],
    groundingPosted: s.groundingInventoryStrip?.posted || [],
    groundingNotPosted: s.groundingInventoryStrip?.notPosted || [],
  };
}

async function main() {
  const payload = await getMatchesPayload({ preferGoat: true, forUrTake: true });
  const match = (payload.matches || []).find((m) => String(m.id) === EVENT_ID);
  if (!match) {
    console.error("No match found for event", EVENT_ID);
    process.exit(1);
  }

  console.log("=== Fixture ===");
  console.log(JSON.stringify({
    eventId: match.id,
    bdlMatchId: match.bdlMatchId,
    home: match.homeTeam,
    away: match.awayTeam,
    status: match.status,
    date: match.date,
  }, null, 2));

  const kvBefore = await readWcMatchPlayerPropsForEvent(EVENT_ID);
  console.log("\n=== KV before force pull ===");
  console.log(JSON.stringify({
    hasRows: hasMatchPlayerPropRows(kvBefore),
    source: kvBefore?.source,
    lastUpdated: kvBefore?.lastUpdated,
    marketCounts: marketCounts(kvBefore),
  }, null, 2));

  console.log("\n=== Force BDL pull (ensureWcBdlMatchPlayerPropsForEvent) ===");
  const pulled = await ensureWcBdlMatchPlayerPropsForEvent(EVENT_ID, {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    bdlMatchId: match.bdlMatchId,
    status: match.status,
    date: match.date,
  });

  const kvAfter = pulled || (await readWcMatchPlayerPropsForEvent(EVENT_ID));
  console.log("\n=== KV after pull ===");
  console.log(JSON.stringify({
    hasRows: hasMatchPlayerPropRows(kvAfter),
    source: kvAfter?.source,
    lastUpdated: kvAfter?.lastUpdated,
    marketCounts: marketCounts(kvAfter),
    samplePropRows: samplePropRows(kvAfter, 12),
  }, null, 2));

  console.log("\n=== loadWcPlayerMarketKvBlocksWithRetry (PLAYER_PROP) ===");
  const kvBlocks = await loadWcPlayerMarketKvBlocksWithRetry(Date.now(), {
    wcEventId: EVENT_ID,
    wcIntent: WC_INTENT.PLAYER_PROP,
    question: "best player props for usa vs australia?",
    matches: payload.matches,
    requiredEntities: ["USA", "AUS"],
  });
  console.log(JSON.stringify({
    wcEventId: kvBlocks.wcEventId,
    loadMeta: kvBlocks.loadMeta,
    marketCounts: marketCounts(kvBlocks.matchPlayerProps),
    samplePropRows: samplePropRows(kvBlocks.matchPlayerProps, 8),
  }, null, 2));

  if (HTTP) {
    console.log("\n=== HTTP ur-take (props ask) ===");
    console.log(JSON.stringify(await probeHttp("best player props for usa vs australia?"), null, 2));
    console.log("\n=== HTTP ur-take (parlay ask) ===");
    console.log(JSON.stringify(await probeHttp("4 player parlay for AUS vs USA?"), null, 2));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
