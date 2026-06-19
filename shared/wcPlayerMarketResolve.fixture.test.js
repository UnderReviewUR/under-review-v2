import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcFixturePlayerPropsListStructured,
  buildWcFixturePlayerParlayStructured,
  resolveWcPlayerMarketAnswer,
} from "./wcPlayerMarketResolve.js";
import { resolveMatchPlayerPropsEventForTeams } from "./wcMatchPlayerProps.js";
import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";
import { WC_INTENT, classifyWcPlayerMarketIntent } from "./wcUrTakeIntent.js";
import { isWcFixtureScopedPlayerMarketQuestion } from "./wcUrTakePlayerMarket.js";
import { isDuplicateWcStructuredCard } from "./wcFixtureMatchupPrebuilt.js";
import { resolveWcPlayerPropFixtureTeams } from "./wcPlayerPropFixture.js";

const kvRoot = {
  byEventId: {
    760416: {
      ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
      lastUpdated: Date.now(),
    },
  },
};

test("resolveMatchPlayerPropsEventForTeams finds ECU vs CIV when seeded", () => {
  const resolved = resolveMatchPlayerPropsEventForTeams(kvRoot, "ECU", "CIV");
  assert.equal(resolved, null);
  const fraBra = resolveMatchPlayerPropsEventForTeams(kvRoot, "FRA", "BRA");
  assert.equal(fraBra?.eventId, "760416");
});

test("buildWcFixturePlayerPropsListStructured — numbered list from KV", () => {
  const structured = buildWcFixturePlayerPropsListStructured(
    "Best player props for Brazil vs France?",
    "market_only",
    { matchPlayerProps: kvRoot },
    null,
  );
  assert.ok(structured);
  assert.match(structured.lean, /^1\./m);
  assert.match(structured.lean, /Mbapp/i);
  assert.match(structured.call, /top player props/i);
});

test("resolveWcPlayerMarketAnswer — fixture props bypass LLM when KV fresh", () => {
  const resolved = resolveWcPlayerMarketAnswer(
    "Best player props for Brazil vs France?",
    WC_INTENT.PLAYER_PROP,
    { playerMarketKv: { matchPlayerProps: kvRoot, goldenBoot: { rows: [] } } },
    { matchPlayerProps: kvRoot, goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] } },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(resolved.structured?.lean || "", /^1\./m);
});

test("resolveWcPlayerMarketAnswer — single-event match props payload (UR Take shape)", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const resolved = resolveWcPlayerMarketAnswer(
    "Best player props for Brazil vs France?",
    WC_INTENT.PLAYER_PROP,
    { wcEventId: "760416" },
    {
      matchPlayerProps: eventPayload,
      wcEventId: "760416",
      goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] },
    },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(resolved.structured?.lean || "", /^1\./m);
  assert.match(resolved.structured?.lean || "", /Mbapp/i);
});

test("buildWcFixturePlayerPropsListStructured — single-event payload", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const structured = buildWcFixturePlayerPropsListStructured(
    "Best player props for Brazil vs France?",
    "market_only",
    { matchPlayerProps: eventPayload, wcEventId: "760416" },
    null,
  );
  assert.ok(structured);
  assert.match(structured.lean, /^1\./m);
});

test("resolveWcPlayerMarketAnswer — follow-up this matchup uses requiredEntities", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const resolved = resolveWcPlayerMarketAnswer(
    "best player props for this matchup?",
    WC_INTENT.PLAYER_PROP,
    { wcEventId: "760416", requiredEntities: ["FRA", "BRA"] },
    {
      matchPlayerProps: eventPayload,
      wcEventId: "760416",
      goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] },
    },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(resolved.structured?.lean || "", /^1\./m);
});

test("resolveWcPlayerMarketAnswer — follow-up this game uses history structured fixture", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const resolved = resolveWcPlayerMarketAnswer(
    "best player props for this game?",
    WC_INTENT.PLAYER_PROP,
    {
      wcEventId: "760416",
      conversationHistory: [
        { role: "user", content: "Best bet on FRA vs BRA tonight?" },
        {
          role: "assistant",
          content: "Lean Under 2.5 goals on FRA vs BRA",
          structured: { fixtureHome: "FRA", fixtureAway: "BRA" },
        },
      ],
    },
    {
      matchPlayerProps: eventPayload,
      wcEventId: "760416",
      goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] },
    },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(resolved.structured?.lean || "", /^1\./m);
  assert.ok(["FRA", "BRA"].includes(resolved.structured?.fixtureHome));
  assert.ok(["FRA", "BRA"].includes(resolved.structured?.fixtureAway));
  assert.notEqual(resolved.structured?.fixtureHome, resolved.structured?.fixtureAway);
});

test("buildWcFixturePlayerParlayStructured — four legs from KV", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const structured = buildWcFixturePlayerParlayStructured(
    "4 player parlay for FRA vs BRA?",
    "market_only",
    { matchPlayerProps: eventPayload, wcEventId: "760416" },
    { requiredEntities: ["FRA", "BRA"] },
    4,
  );
  assert.ok(structured);
  assert.match(structured.lean, /^1\./m);
  assert.equal((structured.lean.match(/\n/g) || []).length + 1, 4);
});

test("resolveWcPlayerMarketAnswer — 4 player parlay uses deterministic legs", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const resolved = resolveWcPlayerMarketAnswer(
    "4 player parlay for FRA vs BRA?",
    WC_INTENT.PLAYER_PROP,
    { wcEventId: "760416", requiredEntities: ["FRA", "BRA"] },
    {
      matchPlayerProps: eventPayload,
      wcEventId: "760416",
      goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] },
    },
  );
  assert.equal(resolved.forcePass, true);
  assert.match(resolved.structured?.call || "", /4-leg player parlay/i);
  assert.equal((String(resolved.structured?.lean || "").match(/\n/g) || []).length + 1, 4);
});

test("resolveWcPlayerMarketAnswer — PARLAY intent routes like PLAYER_PROP (not LLM fallback)", () => {
  const eventPayload = {
    ...WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT["760416"],
    eventId: "760416",
    lastUpdated: Date.now(),
  };
  const withProps = resolveWcPlayerMarketAnswer(
    "4 player parlay for FRA vs BRA?",
    WC_INTENT.PARLAY,
    { wcEventId: "760416", requiredEntities: ["FRA", "BRA"] },
    {
      matchPlayerProps: eventPayload,
      wcEventId: "760416",
      goldenBoot: { rows: [{ name: "Mbappé", americanOdds: "+600" }] },
    },
  );
  assert.equal(withProps.forcePass, true);
  assert.match(withProps.structured?.call || "", /4-leg player parlay/i);
  assert.equal(withProps.structured?.callType, "parlay");

  const withoutProps = resolveWcPlayerMarketAnswer(
    "4 player parlay for FRA vs BRA?",
    WC_INTENT.PARLAY,
    { wcEventId: "760416", requiredEntities: ["FRA", "BRA"] },
    { matchPlayerProps: null, wcEventId: "760416" },
  );
  assert.equal(withoutProps.forcePass, true);
  assert.match(withoutProps.structured?.call || "", /Pass on 4-leg player parlay/i);
  assert.equal(withoutProps.structured?.callType, "parlay");
});

test("isWcFixtureScopedPlayerMarketQuestion — scorer and pass leader follow-ups", () => {
  const q =
    "Who's most likely to score from each team? And who will lead each team in passes?";
  assert.equal(isWcFixtureScopedPlayerMarketQuestion(q), true);
  assert.equal(classifyWcPlayerMarketIntent(q), WC_INTENT.PLAYER_PROP);
});

test("resolveWcPlayerPropFixtureTeams — scorer follow-up pins SWE/TUN from history", () => {
  const history = [
    {
      role: "assistant",
      structured: { fixtureHome: "SWE", fixtureAway: "TUN", wcEventId: "760424" },
    },
  ];
  const teams = resolveWcPlayerPropFixtureTeams(
    "Who's most likely to score from each team? And who will lead each team in passes?",
    history,
  );
  assert.deepEqual(teams, ["SWE", "TUN"]);
});

test("isDuplicateWcStructuredCard — blocks verbatim lean repeat", () => {
  const history = [
    { role: "assistant", structured: { lean: "Lean Under 2.5 goals" } },
  ];
  assert.equal(
    isDuplicateWcStructuredCard({ lean: "Lean Under 2.5 goals" }, history),
    true,
  );
  assert.equal(
    isDuplicateWcStructuredCard({ lean: "1. Player A anytime scorer +500" }, history),
    false,
  );
});
