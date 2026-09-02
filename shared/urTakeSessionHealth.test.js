import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveAskSessionHealthFromMsgs,
  deriveScopedBoardHealth,
  shouldSuppressPaywallPush,
} from "./urTakeSessionHealth.js";

test("deriveScopedBoardHealth flags empty NFL board", () => {
  const h = deriveScopedBoardHealth({
    sport: "nfl",
    matchCount: 0,
    propLineCount: 12,
    boardLoading: false,
  });
  assert.equal(h.scoped, true);
  assert.equal(h.healthy, false);
  assert.equal(h.reason, "empty_matches");
});

test("deriveScopedBoardHealth ignores non-scoped sports", () => {
  const h = deriveScopedBoardHealth({ sport: "nba", matchCount: 0, propLineCount: 0 });
  assert.equal(h.scoped, false);
  assert.equal(h.healthy, true);
});

test("shouldSuppressPaywallPush on fail-soft thread", () => {
  const ask = deriveAskSessionHealthFromMsgs([
    { role: "user", text: "q" },
    { role: "ai", urTakeFailSoft: { message: "x" } },
  ]);
  assert.ok(shouldSuppressPaywallPush({ askHealth: ask }));
});

test("shouldSuppressPaywallPush when board unhealthy", () => {
  const board = deriveScopedBoardHealth({
    sport: "laliga",
    matchCount: 54,
    propLineCount: 0,
    boardLoading: false,
  });
  assert.ok(shouldSuppressPaywallPush({ boardHealth: board }));
});
