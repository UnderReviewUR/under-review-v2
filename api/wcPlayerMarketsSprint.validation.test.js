/**
 * Phase B — World Cup player markets UR Take sprint validation.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { formatWcPlayerMarketsPromptBlock } from "./_wcPlayerUrTakeContext.js";
import { WC_RELEVANCE_REGRESSION_TURNS } from "./wcUrTakeRelevance.fixture.js";
import {
  MOCK_WC_PLAYER_MARKET_KV,
  MOCK_WC_MATCH_PLAYER_PROPS_EVENT,
  mockWcContextWithPlayerMarkets,
} from "./wcPlayerMarkets.fixture.js";
import { runWcUrTakeQA } from "./_wcUrTakeQA.js";
import {
  buildWcPlayerMarketPrebuiltStructured,
  resolveWcPlayerMarketAnswer,
  resolveWcPlayerMarketTier,
} from "../shared/wcPlayerMarketResolve.js";
import { classifyWcQuestionIntent } from "../shared/wcUrTakeIntent.js";
import { resolveWcPlayerMarketResponse } from "../shared/wcUrTakePlayerMarket.js";
import { classifyWcVerdictForUi } from "../shared/wcUrTakeVerdict.js";
import { mergeGoldenBootConsensus } from "../shared/wcGoldenBootConsensus.js";
import { buildWcPlayerMarketsStatus } from "./_wcPlayerMarketsStatus.js";
import { applyGoldenBootManualPatches } from "./_wcPlayerMarketsOverride.js";

const PLAYER_TURNS = WC_RELEVANCE_REGRESSION_TURNS.filter((t) => t.expectPlayerNames);

test("Phase B — player fixture turns use market tier with KV", () => {
  assert.ok(PLAYER_TURNS.length >= 3);
  for (const turn of PLAYER_TURNS) {
    const intent = classifyWcQuestionIntent(turn.question);
    assert.equal(intent, turn.expectedIntent, turn.question);
    const ctx = mockWcContextWithPlayerMarkets({
      wcIntent: intent,
      wcEventId: turn.wcEventId || null,
    });
    const tier = resolveWcPlayerMarketTier({
      goldenBoot: ctx.playerMarketKv.goldenBoot,
      players: ctx.playerMarketKv.players,
      matchPlayerProps: ctx.playerMarketKv.matchPlayerProps,
      wcEventId: ctx.wcEventId,
      wcContext: ctx,
      wcIntent: intent,
    });
    assert.equal(tier, turn.expectPlayerMarketTier, turn.question);
    const resolved = resolveWcPlayerMarketResponse(turn.question, intent, ctx);
    assert.equal(resolved.forcePass, false, turn.question);
    assert.ok(resolved.promptAppendix?.includes("GOLDEN BOOT"), turn.question);
  }
});

test("Phase B — prebuilt answer passes player QA", () => {
  for (const turn of PLAYER_TURNS) {
    const intent = classifyWcQuestionIntent(turn.question);
    const prebuilt = buildWcPlayerMarketPrebuiltStructured(
      turn.question,
      intent,
      turn.expectPlayerMarketTier || "market_only",
      MOCK_WC_PLAYER_MARKET_KV.goldenBoot,
      turn.wcEventId
        ? {
            matchPlayerProps: MOCK_WC_MATCH_PLAYER_PROPS_EVENT,
            wcEventId: turn.wcEventId,
          }
        : {},
    );
    assert.ok(prebuilt, turn.question);
    const qa = runWcUrTakeQA({
      responseText: `${prebuilt.lean}\n\n${prebuilt.whyNow}`,
      structured: prebuilt,
      question: turn.question,
      wcIntent: intent,
      playerMarketKv: MOCK_WC_PLAYER_MARKET_KV,
      playerMarketTier: "market_only",
    });
    assert.equal(qa.passed, true, turn.question);
    assert.equal(qa.qaPlayerMatch, "pass", turn.question);
    const blob = `${prebuilt.lean} ${prebuilt.whyNow}`;
    for (const name of turn.expectPlayerNames) {
      const last = name.split(/\s+/).pop() || name;
      assert.ok(
        blob.includes(name) || blob.includes(last),
        `${turn.question}: expected ${name} in response`,
      );
    }
  }
});

test("Phase B — prompt block includes golden boot rows", () => {
  const block = formatWcPlayerMarketsPromptBlock({
    tier: "market_only",
    tierLabel: "Market Odds",
    tierDisclaimer: "test",
    wcIntent: "GOLDEN_BOOT",
    goldenBoot: MOCK_WC_PLAYER_MARKET_KV.goldenBoot,
    players: MOCK_WC_PLAYER_MARKET_KV.players,
    injuries: MOCK_WC_PLAYER_MARKET_KV.injuries,
    matchDetails: [],
  });
  assert.match(block, /GOLDEN BOOT/);
  assert.match(block, /Mbapp/);
  assert.match(block, /\+600/);
});

test("Phase C — prompt block includes match player props when event pinned", () => {
  const block = formatWcPlayerMarketsPromptBlock({
    tier: "verified",
    tierLabel: "Market Odds · Verified",
    tierDisclaimer: "test",
    wcIntent: "PLAYER_PROP",
    goldenBoot: MOCK_WC_PLAYER_MARKET_KV.goldenBoot,
    players: MOCK_WC_PLAYER_MARKET_KV.players,
    injuries: MOCK_WC_PLAYER_MARKET_KV.injuries,
    matchDetails: [],
    matchPlayerProps: MOCK_WC_MATCH_PLAYER_PROPS_EVENT,
    wcEventId: "760416",
  });
  assert.match(block, /MATCH PLAYER PROPS/);
  assert.match(block, /ANYTIME GOALSCORER/);
  assert.match(block, /PLAYER ASSISTS \(O\/U\)/);
  assert.match(block, /PLAYER SHOTS ON TARGET \(O\/U\)/);
  assert.match(block, /PLAYER TO RECEIVE A CARD/);
  assert.match(block, /Mbapp/);
  assert.match(block, /\+180/);
  assert.match(block, /Over 0\.5: \+140/);
});

test("Phase C — prompt block includes registry card leaders when present", () => {
  const block = formatWcPlayerMarketsPromptBlock({
    tier: "market_only",
    tierLabel: "Market Odds",
    tierDisclaimer: "test",
    wcIntent: "TOP_SCORER",
    goldenBoot: MOCK_WC_PLAYER_MARKET_KV.goldenBoot,
    players: {
      teams: {
        BRA: {
          abbr: "BRA",
          players: [
            {
              name: "Casemiro",
              nationAbbr: "BRA",
              goalsTournament: 0,
              assistsTournament: 0,
              yellowCardsTournament: 2,
              redCardsTournament: 0,
              isStarterLikely: true,
            },
          ],
        },
      },
    },
    injuries: MOCK_WC_PLAYER_MARKET_KV.injuries,
    matchDetails: [],
  });
  assert.match(block, /yellow card leaders/);
  assert.match(block, /Casemiro/);
});

test("Phase C — verified tier when match props fresh + wcEventId", () => {
  const ctx = mockWcContextWithPlayerMarkets({
    wcIntent: "PLAYER_PROP",
    wcEventId: "760416",
  });
  const tier = resolveWcPlayerMarketTier({
    goldenBoot: ctx.playerMarketKv.goldenBoot,
    players: ctx.playerMarketKv.players,
    matchPlayerProps: ctx.playerMarketKv.matchPlayerProps,
    wcEventId: "760416",
    wcContext: ctx,
    wcIntent: "PLAYER_PROP",
  });
  assert.equal(tier, "verified");
});

test("Phase B — team pricing turn unchanged (no player tier)", () => {
  const turn = WC_RELEVANCE_REGRESSION_TURNS[1];
  const intent = classifyWcQuestionIntent(turn.question);
  assert.equal(intent, "ENTITY_PRICING");
  const resolved = resolveWcPlayerMarketAnswer(
    turn.question,
    intent,
    { matchDetails: [] },
    null,
  );
  assert.equal(resolved.forcePass, false);
});

test("Phase D — UK/aggregator books improve consensus depth", () => {
  const mbappe = { name: "Kylian Mbappé", americanOdds: "+600", nationAbbr: "FRA" };
  const usOnly = mergeGoldenBootConsensus(
    [
      { book: "draftkings", ok: true, rows: [{ ...mbappe, americanOdds: "+600" }] },
      { book: "fanduel", ok: true, rows: [{ ...mbappe, americanOdds: "+700" }] },
    ],
    [],
  );
  const withUk = mergeGoldenBootConsensus(
    [
      { book: "draftkings", ok: true, rows: [{ ...mbappe, americanOdds: "+600" }] },
      { book: "fanduel", ok: true, rows: [{ ...mbappe, americanOdds: "+700" }] },
      { book: "paddypower", ok: true, rows: [{ ...mbappe, americanOdds: "+620" }] },
      { book: "oddschecker", ok: true, rows: [{ ...mbappe, americanOdds: "+680" }] },
    ],
    [],
  );
  assert.equal(Object.keys(usOnly.rows[0].bookOdds).length, 2);
  assert.equal(Object.keys(withUk.rows[0].bookOdds).length, 4);
  assert.ok(withUk.booksUsed.includes("paddypower"));
});

test("Phase D — manual golden boot patch applies on read path", () => {
  const patched = applyGoldenBootManualPatches({
    rows: MOCK_WC_PLAYER_MARKET_KV.goldenBoot.rows.slice(0, 3),
    _manualPatches: [{ name: "Kylian Mbappé", americanOdds: "+425", nationAbbr: "FRA" }],
  });
  const row = patched.rows.find((r) => /Mbapp/i.test(r.name));
  assert.equal(row.americanOdds, "+425");
});

test("Phase D — player markets status view shape", async () => {
  const status = await buildWcPlayerMarketsStatus();
  assert.ok(status.alerts.goldenBootStaleHours === null || status.alerts.goldenBootStaleHours >= 0);
  assert.ok(typeof status.alerts.playerRegistryCoverage.playerCount === "number");
});

test("Phase B — verdict uses player market call types", () => {
  const message = {
    sport: "worldcup",
    structured: {
      callType: "player_market_odds",
      playerMarketTier: "market_only",
      lean: "Lean: Kylian Mbappé leads at +600.",
      whyNow: "Top contenders listed.",
    },
  };
  assert.equal(classifyWcVerdictForUi(message), "PLAYER_MARKET_PASS");
});
