import test from "node:test";
import assert from "node:assert/strict";
import {
  matchPlayerPropsUsableForUrTake,
  isMatchPlayerPropsFresh,
} from "./wcMatchPlayerProps.js";

const nowMs = Date.parse("2026-06-18T20:00:00.000Z");

test("matchPlayerPropsUsableForUrTake — fresh pre-match board", () => {
  const payload = {
    source: "balldontlie",
    lastUpdated: nowMs - 60_000,
    markets: {
      player_sot_ou: [{ name: "Pulisic", americanOdds: "-205", line: "0.5" }],
    },
  };
  assert.equal(isMatchPlayerPropsFresh(payload, nowMs), true);
  assert.equal(matchPlayerPropsUsableForUrTake(payload, { nowMs }), true);
});

test("matchPlayerPropsUsableForUrTake — stale pre-match rejected when not live", () => {
  const payload = {
    source: "balldontlie",
    lastUpdated: nowMs - 3 * 60 * 60 * 1000,
    matchStatus: "NS",
    markets: {
      player_sot_ou: [{ name: "Pulisic", americanOdds: "-205", line: "0.5" }],
    },
  };
  assert.equal(isMatchPlayerPropsFresh(payload, nowMs), false);
  assert.equal(
    matchPlayerPropsUsableForUrTake(payload, { nowMs, matchStatus: "NS" }),
    false,
  );
});

test("matchPlayerPropsUsableForUrTake — stale pre-match allowed during live", () => {
  const payload = {
    source: "balldontlie",
    lastUpdated: nowMs - 3 * 60 * 60 * 1000,
    matchStatus: "live",
    markets: {
      player_sot_ou: [{ name: "Pulisic", americanOdds: "-205", line: "0.5" }],
    },
  };
  assert.equal(isMatchPlayerPropsFresh(payload, nowMs), false);
  assert.equal(
    matchPlayerPropsUsableForUrTake(payload, { nowMs, matchStatus: "live" }),
    true,
  );
});
