#!/usr/bin/env node
/**
 * Post-fix probe: "best player props for haiti tonight?"
 */
import { getMatchesPayload } from "../api/world-cup.js";
import { loadWcPlayerMarketKvBlocksWithRetry } from "../api/_wcPlayerUrTakeContext.js";
import {
  hasMatchPlayerPropRows,
  isMatchPlayerPropsFresh,
  matchPlayerPropNationMatchesTeam,
  matchPlayerPropRowsFromEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
} from "../shared/wcMatchPlayerProps.js";
import {
  resolveWcPlayerPropFixtureTeams,
  resolveWcEventIdForPlayerNation,
} from "../shared/wcPlayerPropFixture.js";
import {
  resolveWcPlayerMarketAnswer,
} from "../shared/wcPlayerMarketResolve.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import { resolveWcPlayerMarketResponse } from "../shared/wcUrTakePlayerMarket.js";

const Q = "best player props for haiti tonight?";
const UR_TAKE_URL = process.env.UR_TAKE_URL || "https://www.under-review.app/api/ur-take";

function countRows(payload) {
  if (!payload) return 0;
  return WC_MATCH_PLAYER_PROP_MARKET_KEYS.reduce(
    (n, key) => n + matchPlayerPropRowsFromEvent(payload, key, 999).length,
    0,
  );
}

async function main() {
  const payload = await getMatchesPayload({ preferGoat: true, forUrTake: true });
  const matches = payload?.matches || [];
  const fixtureTeams = resolveWcPlayerPropFixtureTeams(Q, [], null, matches);
  const nationEventId = resolveWcEventIdForPlayerNation(matches, "HAI");

  console.log("=== FIXTURE PIN ===");
  console.log(JSON.stringify({ fixtureTeams, nationEventId }, null, 2));

  const kv = await loadWcPlayerMarketKvBlocksWithRetry(
    Date.now(),
    {
      wcEventId: nationEventId,
      wcIntent: WC_INTENT.PLAYER_PROP,
      question: Q,
      matches,
      conversationHistory: [],
      requiredEntities: fixtureTeams,
    },
    { maxRetries: 2, backoffMs: 400 },
  );

  const haitiRows = matchPlayerPropRowsFromEvent(kv.matchPlayerProps, "anytime_scorer", 50)
    .filter((r) => matchPlayerPropNationMatchesTeam(r.nationAbbr, "HAI"));

  console.log("\n=== loadWcPlayerMarketKvBlocksWithRetry ===");
  console.log(
    JSON.stringify(
      {
        wcEventId: kv.wcEventId,
        loadMeta: kv.loadMeta,
        hasMatchPlayerPropRows: hasMatchPlayerPropRows(kv.matchPlayerProps),
        isMatchPlayerPropsFresh: isMatchPlayerPropsFresh(kv.matchPlayerProps),
        totalRowCount: countRows(kv.matchPlayerProps),
        haitiAnytimeRowCount: haitiRows.length,
        haitiSample: haitiRows.slice(0, 3).map((r) => ({
          name: r.name,
          odds: r.americanOdds,
          nation: r.nationAbbr,
        })),
        htiMatchesHai: haitiRows.some((r) => matchPlayerPropNationMatchesTeam(r.nationAbbr, "HAI")),
      },
      null,
      2,
    ),
  );

  const wcContext = {
    allMatches: matches,
    wcEventId: kv.wcEventId,
    playerMarketKv: kv,
    conversationHistory: [],
  };
  const resolved = resolveWcPlayerMarketResponse(Q, WC_INTENT.PLAYER_PROP, wcContext);
  const answer = resolveWcPlayerMarketAnswer(Q, WC_INTENT.PLAYER_PROP, wcContext, kv);

  console.log("\n=== resolveWcPlayerMarketResponse ===");
  console.log(
    JSON.stringify(
      {
        forcePass: resolved.forcePass,
        structuredCall: resolved.structured?.call,
        genericSlatePass: /today's slate/i.test(String(resolved.structured?.call || "")),
      },
      null,
      2,
    ),
  );

  console.log("\n=== resolveWcPlayerMarketAnswer ===");
  console.log(
    JSON.stringify(
      {
        forcePass: answer.forcePass,
        structuredCall: answer.structured?.call,
      },
      null,
      2,
    ),
  );

  const res = await fetch(UR_TAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-ur-take-structured": "1" },
    body: JSON.stringify({ question: Q, sportHint: "worldcup", structured: true }),
  });
  const j = await res.json();
  const s = j.structured || {};
  console.log("\n=== PROD HTTP ===");
  console.log(
    JSON.stringify(
      {
        http: res.status,
        callType: s.callType,
        call: s.call,
        wcEventId: j.wcEventId ?? s.wcEventId,
        coldSlatePass: /today's slate/i.test(String(s.call || "")),
        playerPropsLoadMeta: j.playerPropsLoadMeta,
      },
      null,
      2,
    ),
  );

  const ok =
    fixtureTeams.length >= 2 &&
    !/today's slate — Pass until lines post/i.test(String(answer.structured?.call || ""));
  if (!ok) {
    console.error("\nPROBE FAILED", {
      fixtureTeams,
      answerCall: answer.structured?.call,
    });
    process.exit(1);
  }
  console.log("\nPROBE PASSED (fixture pin + no generic slate pass headline)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
