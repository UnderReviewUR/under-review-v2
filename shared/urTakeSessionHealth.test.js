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

test("shouldSuppressPaywallPush when board has no fixtures", () => {
  const board = deriveScopedBoardHealth({
    sport: "laliga",
    matchCount: 0,
    propLineCount: 0,
    boardLoading: false,
  });
  assert.equal(board.healthy, false);
  assert.equal(board.reason, "empty_matches");
  assert.ok(shouldSuppressPaywallPush({ boardHealth: board }));
});

test("deriveScopedBoardHealth stays healthy with fixtures even if props are empty", () => {
  const board = deriveScopedBoardHealth({
    sport: "nfl",
    matchCount: 16,
    propLineCount: 0,
    boardLoading: false,
  });
  assert.equal(board.healthy, true);
  assert.equal(board.reason, "thin_prop_lines");
  assert.ok(!shouldSuppressPaywallPush({ boardHealth: board }));
});
