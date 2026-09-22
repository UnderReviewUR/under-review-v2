import assert from "node:assert/strict";
import test from "node:test";
import { isNflScopedPropFastPath } from "./nflAskFastPath.js";
import { nflAskUsesMarriedPropPath, resolveNflAskModelLane } from "./nflAskModelRoute.js";
import { parseNflFirstAsk } from "./nflAskParse.js";

const TOTAL =
  "On CAR @ ATL, the total is 43.5. Over, under, or pass? Give me the lean.";
const COWBOYS =
  "best player props for cowboys vs commanders? anything for javonte williams, jayden daniels, spann ford, dak, ceedee lamb, pickens, diggs?";

test("CAR @ ATL 43.5 is a game total, not a props board", () => {
  const ask = parseNflFirstAsk(TOTAL);
  assert.equal(ask.marketId, "total");
  assert.equal(ask.lane, "game_price");
  assert.equal(ask.line, 43.5);
  assert.ok(ask.teams.includes("CAR"));
  assert.ok(ask.teams.includes("ATL"));
  assert.equal(ask.players.length, 0);
  assert.equal(nflAskUsesMarriedPropPath(TOTAL), false);
  assert.equal(nflAskUsesMarriedPropPath(TOTAL, { fastPathActive: true }), false);
  assert.equal(isNflScopedPropFastPath(TOTAL), false);
  assert.equal(resolveNflAskModelLane(TOTAL).lane, "sonnet");
});

test("a spread ask stays on the game-price lane", () => {
  const q = "On TEN @ SF, the spread is 6.5. Who covers?";
  const ask = parseNflFirstAsk(q);
  assert.equal(ask.lane, "game_price");
  assert.equal(ask.marketId, "spread");
  assert.equal(nflAskUsesMarriedPropPath(q), false);
});

test("Cowboys vs Commanders named board is props, with every name", () => {
  const ask = parseNflFirstAsk(COWBOYS);
  assert.equal(ask.lane, "props_board");
  assert.equal(ask.marketId, "props_board");
  assert.ok(ask.teams.includes("DAL"));
  assert.ok(ask.teams.includes("WAS") || ask.teams.includes("WSH"));
  const players = ask.players.join(" | ");
  assert.match(players, /javonte williams/);
  assert.match(players, /jayden daniels/);
  assert.match(players, /dak prescott/);
  assert.match(players, /ceedee lamb/);
  assert.match(players, /pickens/);
  assert.match(players, /diggs/);
  assert.match(players, /spann ford/);
  assert.equal(nflAskUsesMarriedPropPath(COWBOYS), true);
  assert.equal(resolveNflAskModelLane(COWBOYS).lane, "married");
});
