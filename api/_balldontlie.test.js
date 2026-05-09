import test from "node:test";
import assert from "node:assert/strict";
import { bdlNestedGameRowDateMs } from "./_balldontlie.js";

test("bdlNestedGameRowDateMs prefers nested game.date", () => {
  const ms = bdlNestedGameRowDateMs({
    date: "2025-01-01",
    game: { date: "2026-03-15" },
  });
  assert.equal(ms, Date.parse("2026-03-15"));
});

test("bdlNestedGameRowDateMs falls back to row.date when game.date missing", () => {
  const ms = bdlNestedGameRowDateMs({
    date: "2026-04-20",
    game: {},
  });
  assert.equal(ms, Date.parse("2026-04-20"));
});

test("bdlNestedGameRowDateMs returns 0 when no dates", () => {
  assert.equal(bdlNestedGameRowDateMs({ game: {} }), 0);
});
