import assert from "node:assert/strict";
import test from "node:test";
import {
  isWcUrTakeV2DeliverEnabled,
  resolveWcUrTakeV2Turn,
  shouldSuppressWcFixtureAltFollowUpPrebuilt,
  shouldSkipWcPlayerPropsFastPathForV2Deliver,
  shouldSkipWcPlayerKvSupplementForV2Deliver,
  resolveWcUrTakeLoadingSportKey,
} from "./wcUrTakePipeline.js";
import { WC_INTENT } from "./wcUrTakeIntent.js";

const MEX_KOR_MATCHES = [
  {
    id: "991122",
    homeTeam: "MEX",
    awayTeam: "KOR",
    status: "scheduled",
    commenceTs: Date.now() + 3600000,
  },
];

const MEX_KOR_PROPS_THREAD = [
  { role: "user", content: "MEX vs KOR moneyline" },
  {
    role: "assistant",
    content: "Lean Mexico +100",
    structured: { fixtureHome: "MEX", fixtureAway: "KOR", wcEventId: "991122" },
    wcEventId: "991122",
  },
  {
    role: "user",
    content: "Son, Jimenez, and Quinones each going over 2.5 shots attempted?",
  },
  {
    role: "assistant",
    content: "3 of 3 playable",
    structured: { fixtureHome: "MEX", fixtureAway: "KOR", wcEventId: "991122" },
    wcEventId: "991122",
  },
];

test("isWcUrTakeV2DeliverEnabled defaults from GOAT primary", () => {
  const prev = process.env.WC_PROPS_ROUTE_V2_DELIVER;
  const prevKey = process.env.BALLDONTLIE_API_KEY;
  delete process.env.WC_PROPS_ROUTE_V2_DELIVER;
  delete process.env.BALLDONTLIE_API_KEY;
  try {
    assert.equal(isWcUrTakeV2DeliverEnabled({}), false);
    process.env.BALLDONTLIE_API_KEY = "test-key";
    assert.equal(isWcUrTakeV2DeliverEnabled({}), true);
    assert.equal(isWcUrTakeV2DeliverEnabled({ deliverHeader: "0" }), false);
    process.env.WC_PROPS_ROUTE_V2_DELIVER = "0";
    assert.equal(isWcUrTakeV2DeliverEnabled({}), false);
  } finally {
    if (prev === undefined) delete process.env.WC_PROPS_ROUTE_V2_DELIVER;
    else process.env.WC_PROPS_ROUTE_V2_DELIVER = prev;
    if (prevKey === undefined) delete process.env.BALLDONTLIE_API_KEY;
    else process.env.BALLDONTLIE_API_KEY = prevKey;
  }
});

test("resolveWcUrTakeV2Turn routes props lane on named player ask", () => {
  const prevKey = process.env.BALLDONTLIE_API_KEY;
  process.env.BALLDONTLIE_API_KEY = "test-key";
  try {
    const turn = resolveWcUrTakeV2Turn({
      question: "Son over 2.5 shots",
      history: MEX_KOR_PROPS_THREAD,
      matches: MEX_KOR_MATCHES,
      wcIntent: WC_INTENT.PLAYER_PROP,
      routeHeader: "1",
    });
    assert.equal(turn.lane, "props");
    assert.equal(turn.propsRoute.applyRoute, true);
    assert.equal(turn.propsRoute.wcEventId, "991122");
  } finally {
    if (prevKey === undefined) delete process.env.BALLDONTLIE_API_KEY;
    else process.env.BALLDONTLIE_API_KEY = prevKey;
  }
});

test("resolveWcUrTakeV2Turn routes matchup_ml on who wins follow-up without KV", () => {
  const turn = resolveWcUrTakeV2Turn({
    question: "Who wins MEX vs KOR?",
    history: MEX_KOR_PROPS_THREAD,
    matches: MEX_KOR_MATCHES,
    wcIntent: WC_INTENT.MATCHUP,
    routeHeader: "1",
  });
  assert.equal(turn.lane, "matchup_ml");
  assert.equal(turn.matchupMl?.wcEventId, "991122");
  assert.equal(turn.matchupMl?.fixtureHome, "MEX");
  assert.equal(turn.matchupMl?.fixtureAway, "KOR");
  assert.equal(turn.propsRoute.applyRoute, false);
});

test("shouldSuppressWcFixtureAltFollowUpPrebuilt blocks who wins thread steal", () => {
  assert.equal(
    shouldSuppressWcFixtureAltFollowUpPrebuilt({
      question: "Who wins MEX vs KOR?",
      history: MEX_KOR_PROPS_THREAD,
      wcIntent: WC_INTENT.MATCHUP,
      v2Deliver: true,
    }),
    true,
  );
});

test("Phase 4 — matchup_ml skips props fast path and KV supplement when V2 deliver on", () => {
  const turn = resolveWcUrTakeV2Turn({
    question: "Who wins MEX vs KOR?",
    history: MEX_KOR_PROPS_THREAD,
    matches: MEX_KOR_MATCHES,
    wcIntent: WC_INTENT.MATCHUP,
    routeHeader: "1",
  });
  assert.equal(turn.lane, "matchup_ml");
  assert.equal(
    shouldSkipWcPlayerPropsFastPathForV2Deliver({ v2Deliver: true, v2Turn: turn }),
    true,
  );
  assert.equal(
    shouldSkipWcPlayerKvSupplementForV2Deliver({ v2Deliver: true, v2Turn: turn }),
    true,
  );
});

test("Phase 4 — props lane keeps delivery arms open", () => {
  const prevKey = process.env.BALLDONTLIE_API_KEY;
  process.env.BALLDONTLIE_API_KEY = "test-key";
  try {
    const turn = resolveWcUrTakeV2Turn({
      question: "Son over 2.5 shots",
      history: MEX_KOR_PROPS_THREAD,
      matches: MEX_KOR_MATCHES,
      wcIntent: WC_INTENT.PLAYER_PROP,
      routeHeader: "1",
    });
    assert.equal(turn.lane, "props");
    assert.equal(
      shouldSkipWcPlayerPropsFastPathForV2Deliver({ v2Deliver: true, v2Turn: turn }),
      false,
    );
  } finally {
    if (prevKey === undefined) delete process.env.BALLDONTLIE_API_KEY;
    else process.env.BALLDONTLIE_API_KEY = prevKey;
  }
});

test("resolveWcUrTakeLoadingSportKey — props vs matchup", () => {
  assert.equal(resolveWcUrTakeLoadingSportKey("worldcup", "Who wins MEX vs KOR?"), "worldcup");
  assert.equal(
    resolveWcUrTakeLoadingSportKey("worldcup", "Son over 2.5 shots"),
    "worldcup_props",
  );
});
