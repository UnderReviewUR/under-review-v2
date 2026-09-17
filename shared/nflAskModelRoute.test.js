import assert from "node:assert/strict";
import test from "node:test";
import {
  nflAskPropsBoardUsesOffline,
  nflAskUsesMarriedPropPath,
  resolveNflAskModelLane,
} from "./nflAskModelRoute.js";

test("props board asks use married offline lane by default", () => {
  const prev = process.env.NFL_ASK_PROPS_BOARD_OFFLINE;
  delete process.env.NFL_ASK_PROPS_BOARD_OFFLINE;
  assert.equal(
    nflAskPropsBoardUsesOffline("best player props for broncos vs chiefs tonight?"),
    true,
  );
  assert.equal(resolveNflAskModelLane("best props for SEA vs NE").lane, "married");
  if (prev !== undefined) process.env.NFL_ASK_PROPS_BOARD_OFFLINE = prev;
});

test("NFL_ASK_PROPS_BOARD_OFFLINE=0 forces Haiku on props boards", () => {
  const prev = process.env.NFL_ASK_PROPS_BOARD_OFFLINE;
  process.env.NFL_ASK_PROPS_BOARD_OFFLINE = "0";
  assert.equal(nflAskPropsBoardUsesOffline("best props for DEN vs KC"), false);
  const lane = resolveNflAskModelLane("best props for DEN vs KC");
  assert.equal(lane.lane, "haiku");
  assert.match(String(lane.model), /haiku/i);
  if (prev !== undefined) process.env.NFL_ASK_PROPS_BOARD_OFFLINE = prev;
  else delete process.env.NFL_ASK_PROPS_BOARD_OFFLINE;
});

test("named / scoped props use married path", () => {
  assert.equal(nflAskUsesMarriedPropPath("Maye over 214.5 passing yards?"), true);
  const lane = resolveNflAskModelLane("Maye over 214.5 passing yards?");
  assert.equal(lane.lane, "married");
  assert.match(String(lane.model), /haiku/i);
});

test("ticket reviews stay on Sonnet", () => {
  const lane = resolveNflAskModelLane(
    "review my ticket: Maye over 214.5, Diggs over 4.5, NE -3.5",
  );
  assert.equal(lane.lane, "sonnet");
  assert.equal(lane.model, null);
});

test("who is X identity asks leave the married props path", () => {
  assert.equal(nflAskUsesMarriedPropPath("Who is Vaki?", { fastPathActive: true }), false);
  assert.equal(resolveNflAskModelLane("Who is Vaki?", { fastPathActive: true }).lane, "sonnet");
  assert.equal(nflAskUsesMarriedPropPath("who's Sione Vaki?"), false);
});
