import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcHomePromoCard,
  ensureWorldCupInHomeQuestions,
} from "./buildWcHomePromoCard.js";

test("buildWcHomePromoCard returns card during promo window", () => {
  const card = buildWcHomePromoCard(Date.parse("2026-06-02T16:00:00Z"));
  assert.ok(card);
  assert.equal(card.sportHint, "worldcup");
});

test("ensureWorldCupInHomeQuestions pins WC first", () => {
  const list = [
    { id: "f1", sportHint: "f1", text: "F1" },
    { id: "wc", sportHint: "worldcup", text: "WC" },
    { id: "nba", sportHint: "nba", text: "NBA" },
  ];
  const out = ensureWorldCupInHomeQuestions(list, Date.parse("2026-06-02T16:00:00Z"));
  assert.equal(out[0].sportHint, "worldcup");
});
