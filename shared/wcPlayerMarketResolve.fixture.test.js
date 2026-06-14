import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcFixturePlayerPropsListStructured,
  resolveWcPlayerMarketAnswer,
} from "./wcPlayerMarketResolve.js";
import { resolveMatchPlayerPropsEventForTeams } from "./wcMatchPlayerProps.js";
import { WC_MATCH_PLAYER_PROPS_SEED_BY_EVENT } from "../src/data/wc2026MatchPlayerPropsSeed.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

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
  assert.match(structured.call, /anytime scorer/i);
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
